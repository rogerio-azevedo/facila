"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { updateUserSchema } from "@/schemas/users";
import { getMembership } from "@/server/dal/company-members";
import { ForbiddenError, requireAuthContext } from "@/server/dal/context";
import { getUserById, updateUser } from "@/server/dal/users";

export type UserActionState = {
  success?: boolean;
  error?: string;
};

export async function updateUserAction(input: unknown): Promise<UserActionState> {
  const ctx = await requireAuthContext();

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return { error: errorMsg };
  }

  const targetUser = await getUserById(parsed.data.userId);
  if (!targetUser) {
    return { error: "Usuário não encontrado." };
  }

  // Verificação de permissões:
  // 1. Super Admin pode alterar qualquer usuário
  // 2. O próprio usuário pode alterar seus dados
  // 3. Admin da empresa pode alterar membros da mesma empresa
  const isSuperAdmin = ctx.role === "super_admin";
  const isSelf = ctx.userId === targetUser.id;

  if (!isSuperAdmin && !isSelf) {
    if (ctx.kind === "company" && ctx.role === "admin") {
      const membership = await getMembership(targetUser.id, ctx.companyId);
      if (!membership) {
        throw new ForbiddenError("Usuário não pertence a esta empresa.");
      }
    } else {
      throw new ForbiddenError();
    }
  }

  let passwordHash: string | undefined;
  if (parsed.data.password && parsed.data.password.trim().length >= 6) {
    passwordHash = await bcrypt.hash(parsed.data.password.trim(), 12);
  }

  await updateUser(targetUser.id, {
    name: parsed.data.name,
    passwordHash,
  });

  revalidatePath("/users");
  revalidatePath("/platform/companies");

  return { success: true };
}

