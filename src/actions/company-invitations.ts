"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import {
  acceptCompanyInvitationSchema,
  createCompanyInvitationSchema,
  revokeCompanyInvitationSchema,
} from "@/schemas/company-invitations";
import { signIn } from "@/server/auth";
import {
  createInvitation,
  findPendingInvitation,
  getInvitationById,
  getInvitationByToken,
  markInvitationAccepted,
  revokeInvitation,
} from "@/server/dal/company-invitations";
import { addMember, getMembership } from "@/server/dal/company-members";
import { ForbiddenError, getCurrentContext, requireAuthContext } from "@/server/dal/context";
import { createUser, findUserByEmail } from "@/server/dal/users";
import { db } from "@/server/db";
import { can } from "@/server/policies";

export type CompanyInvitationActionResult = {
  success?: boolean;
  error?: string;
  token?: string;
  inviteUrl?: string;
};

export async function createCompanyInvitationAction(
  input: unknown,
): Promise<CompanyInvitationActionResult> {
  const ctx = await requireAuthContext();
  if (!can(ctx, "company-invitations:manage")) {
    throw new ForbiddenError();
  }

  const parsed = createCompanyInvitationSchema.safeParse(input);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return { error: errorMsg };
  }

  let companyId: string;
  if (ctx.kind === "platform") {
    if (!parsed.data.companyId) {
      return { error: "ID da empresa é obrigatório." };
    }
    companyId = parsed.data.companyId;
  } else {
    companyId = ctx.companyId;
  }

  const email = parsed.data.email.toLowerCase();

  // Verifica se o usuário já é membro desta empresa
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const existingMembership = await getMembership(existingUser.id, companyId);
    if (existingMembership) {
      return { error: "Este usuário já é membro desta empresa." };
    }
  }

  // Verifica se já existe um convite pendente ativo
  const existingPending = await findPendingInvitation(email, companyId);
  if (existingPending) {
    return {
      success: true,
      token: existingPending.token,
      inviteUrl: `/invite/${existingPending.token}`,
    };
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  const invitation = await createInvitation({
    companyId,
    email,
    role: parsed.data.role,
    token,
    invitedByUserId: ctx.userId,
    expiresAt,
  });

  revalidatePath("/users");
  revalidatePath("/platform/companies");

  return {
    success: true,
    token: invitation.token,
    inviteUrl: `/invite/${invitation.token}`,
  };
}

export async function revokeCompanyInvitationAction(
  input: unknown,
): Promise<{ success?: boolean; error?: string }> {
  const ctx = await requireAuthContext();
  if (!can(ctx, "company-invitations:manage")) {
    throw new ForbiddenError();
  }

  const parsed = revokeCompanyInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "ID do convite inválido." };
  }

  const invitation = await getInvitationById(parsed.data.invitationId);
  if (!invitation) {
    return { error: "Convite não encontrado." };
  }

  if (ctx.kind === "company" && invitation.companyId !== ctx.companyId) {
    throw new ForbiddenError();
  }

  await revokeInvitation(invitation.id);

  revalidatePath("/users");
  revalidatePath("/platform/companies");

  return { success: true };
}

export async function acceptCompanyInvitationAction(
  input: unknown,
): Promise<{ success?: boolean; error?: string }> {
  const parsed = acceptCompanyInvitationSchema.safeParse(input);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return { error: errorMsg };
  }

  const invitation = await getInvitationByToken(parsed.data.token);
  if (!invitation) {
    return { error: "Convite não encontrado." };
  }

  if (invitation.acceptedAt) {
    return { error: "Este convite já foi utilizado." };
  }

  if (invitation.revokedAt) {
    return { error: "Este convite foi cancelado pelo administrador." };
  }

  if (new Date() > invitation.expiresAt) {
    return { error: "Este convite expirou. Solicite um novo link ao administrador." };
  }

  const existingUser = await findUserByEmail(invitation.email);
  const currentCtx = await getCurrentContext();

  try {
    if (existingUser) {
      // Usuário já cadastrado
      if (currentCtx?.userId !== existingUser.id) {
        // Se não estiver logado como ele mesmo, valida a senha informada
        if (!parsed.data.password) {
          return { error: "Informe sua senha para aceitar o convite." };
        }
        if (!existingUser.passwordHash) {
          return { error: "Conta vinculada a login social. Faça login antes de aceitar." };
        }
        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          existingUser.passwordHash,
        );
        if (!passwordMatches) {
          return { error: "Senha incorreta." };
        }
      }

      await db.transaction(async (tx) => {
        const membership = await getMembership(existingUser.id, invitation.companyId, tx);
        if (!membership) {
          await addMember(
            {
              companyId: invitation.companyId,
              userId: existingUser.id,
              role: invitation.role,
            },
            tx,
          );
        }
        await markInvitationAccepted(invitation.id, tx);
      });

      // Se não estiver logado, faz login com as credenciais
      if (currentCtx?.userId !== existingUser.id) {
        await signIn("credentials", {
          email: invitation.email,
          password: parsed.data.password,
          redirectTo: "/dashboard",
        });
      }
    } else {
      // Primeiro acesso: Novo usuário
      if (!parsed.data.name || parsed.data.name.trim().length < 2) {
        return { error: "Por favor, informe seu nome completo." };
      }
      if (!parsed.data.password || parsed.data.password.length < 6) {
        return { error: "A senha deve conter ao menos 6 caracteres." };
      }

      await db.transaction(async (tx) => {
        const newUser = await createUser(
          {
            name: parsed.data.name!.trim(),
            email: invitation.email,
            password: parsed.data.password!,
            platformRole: "user",
          },
          tx,
        );

        await addMember(
          {
            companyId: invitation.companyId,
            userId: newUser.id,
            role: invitation.role,
          },
          tx,
        );

        await markInvitationAccepted(invitation.id, tx);
      });

      await signIn("credentials", {
        email: invitation.email,
        password: parsed.data.password,
        redirectTo: "/dashboard",
      });
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Erro ao aceitar convite:", error);
    return { error: "Não foi possível concluir o cadastro. Tente novamente." };
  }

  return { success: true };
}

