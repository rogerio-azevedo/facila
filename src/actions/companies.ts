"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateSession } from "@/server/auth";
import { createCompanyAsSuperAdmin, getCompanyById } from "@/server/dal/companies";
import {
  ForbiddenError,
  requireAuthContext,
  requirePlatformContext,
} from "@/server/dal/context";
import { getMembership } from "@/server/dal/session";
import { can } from "@/server/policies";
import { actAsCompanySchema, createCompanySchema } from "@/schemas/auth";

export async function createCompanyAction(input: unknown) {
  const ctx = await requirePlatformContext();
  if (!can(ctx, "platform:companies")) {
    throw new ForbiddenError();
  }

  const parsed = createCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await createCompanyAsSuperAdmin(parsed.data);
  revalidatePath("/platform/companies");
  return { success: true };
}

export async function createCompanyFormAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const result = await createCompanyAction({
    name: formData.get("name"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });

  if ("error" in result && result.error) {
    return { error: "Dados inválidos" };
  }

  return { success: true };
}

export async function actAsCompanyAction(input: unknown) {
  const ctx = await requireAuthContext();
  if (!can(ctx, "platform:act-as")) {
    throw new ForbiddenError();
  }

  const parsed = actAsCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Empresa inválida" };
  }

  const company = await getCompanyById(parsed.data.companyId);
  if (!company) {
    return { error: "Empresa não encontrada" };
  }

  await updateSession({
    user: {
      activeCompanyId: company.id,
      companyRole: null,
      isActingAs: true,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function actAsCompanyFormAction(formData: FormData) {
  const companyId = formData.get("companyId");
  await actAsCompanyAction({ companyId });
}

export async function stopActAsCompanyAction() {
  const ctx = await requireAuthContext();
  if (ctx.kind !== "company" || !ctx.isActingAs) {
    throw new ForbiddenError();
  }

  await updateSession({
    user: {
      activeCompanyId: null,
      companyRole: null,
      isActingAs: false,
    },
  });

  revalidatePath("/platform/companies");
  redirect("/platform/companies");
}

export async function switchCompanyAction(companyId: string) {
  const session = await requireAuthContext();

  if (session.kind === "platform") {
    return actAsCompanyAction({ companyId });
  }

  const membership = await getMembership(session.userId, companyId);
  if (!membership) {
    throw new ForbiddenError();
  }

  await updateSession({
    user: {
      activeCompanyId: companyId,
      companyRole: membership.role,
      isActingAs: false,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
