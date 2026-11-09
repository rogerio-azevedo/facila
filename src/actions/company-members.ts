"use server";

import { revalidatePath } from "next/cache";

import {
  removeCompanyMemberSchema,
  updateCompanyMemberRoleSchema,
} from "@/schemas/company-members";
import {
  countAdminsInCompany,
  deleteMember,
  getMemberById,
  listMembersWithUsers,
  updateMemberRole,
} from "@/server/dal/company-members";
import { listInvitationsByCompanyId } from "@/server/dal/company-invitations";
import { ForbiddenError, requireAuthContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export type CompanyMemberActionState = {
  success?: boolean;
  error?: string;
};

export async function getCompanyMembersAndInvitationsAction(companyId: string) {
  const ctx = await requireAuthContext();
  if (ctx.kind === "company" && ctx.companyId !== companyId) {
    throw new ForbiddenError();
  }
  if (!can(ctx, "company-members:read")) {
    throw new ForbiddenError();
  }

  const [members, invitations] = await Promise.all([
    listMembersWithUsers(companyId),
    listInvitationsByCompanyId(companyId),
  ]);

  return { members, invitations };
}

export async function updateCompanyMemberRoleAction(
  input: unknown,
): Promise<CompanyMemberActionState> {
  const ctx = await requireAuthContext();
  if (!can(ctx, "company-members:manage")) {
    throw new ForbiddenError();
  }

  const parsed = updateCompanyMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }

  const targetMember = await getMemberById(parsed.data.memberId);
  if (!targetMember) {
    return { error: "Membro não encontrado." };
  }

  // Se não for super admin de plataforma, garantir que o membro pertence à empresa ativa
  if (ctx.kind === "company" && targetMember.companyId !== ctx.companyId) {
    throw new ForbiddenError();
  }

  // Se estiver rebaixando de admin para member, verificar se resta ao menos outro admin
  if (targetMember.role === "admin" && parsed.data.role === "member") {
    const adminCount = await countAdminsInCompany(targetMember.companyId);
    if (adminCount <= 1) {
      return { error: "A empresa precisa manter ao menos um administrador." };
    }
  }

  await updateMemberRole(parsed.data.memberId, parsed.data.role);

  revalidatePath("/users");
  revalidatePath("/platform/companies");

  return { success: true };
}

export async function removeCompanyMemberAction(
  input: unknown,
): Promise<CompanyMemberActionState> {
  const ctx = await requireAuthContext();
  if (!can(ctx, "company-members:manage")) {
    throw new ForbiddenError();
  }

  const parsed = removeCompanyMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }

  const targetMember = await getMemberById(parsed.data.memberId);
  if (!targetMember) {
    return { error: "Membro não encontrado." };
  }

  // Se não for super admin de plataforma, garantir que o membro pertence à empresa ativa
  if (ctx.kind === "company" && targetMember.companyId !== ctx.companyId) {
    throw new ForbiddenError();
  }

  // Se for admin, impedir remoção caso seja o único
  if (targetMember.role === "admin") {
    const adminCount = await countAdminsInCompany(targetMember.companyId);
    if (adminCount <= 1) {
      return { error: "Não é possível remover o único administrador da empresa." };
    }
  }

  await deleteMember(parsed.data.memberId);

  revalidatePath("/users");
  revalidatePath("/platform/companies");

  return { success: true };
}
