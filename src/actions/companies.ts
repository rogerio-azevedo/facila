"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actAsCompanySchema, createCompanySchema } from "@/schemas/companies";
import { userSchema } from "@/schemas/users";
import { updateSession } from "@/server/auth";
import { addMember, getMembership } from "@/server/dal/company-members";
import { createCompany, getCompanyById } from "@/server/dal/companies";
import {
  ForbiddenError,
  requireAuthContext,
  requirePlatformContext,
} from "@/server/dal/context";
import { createUser, findUserByEmail, isSuperAdminEmail } from "@/server/dal/users";
import { db } from "@/server/db";
import { can } from "@/server/policies";

export async function createCompanyAction(input: unknown) {
  const ctx = await requirePlatformContext();
  if (!can(ctx, "platform:companies")) {
    throw new ForbiddenError();
  }

  const payload = input as {
    name?: unknown;
    adminName?: unknown;
    adminEmail?: unknown;
    adminPassword?: unknown;
  };

  const companyParsed = createCompanySchema.safeParse({ name: payload.name });
  const adminParsed = userSchema.safeParse({
    name: payload.adminName,
    email: payload.adminEmail,
    password: payload.adminPassword,
  });

  if (!companyParsed.success || !adminParsed.success) {
    const companyErrors = companyParsed.success ? {} : companyParsed.error.flatten().fieldErrors;
    const adminErrors = adminParsed.success
      ? {}
      : {
          adminName: adminParsed.error.flatten().fieldErrors.name,
          adminEmail: adminParsed.error.flatten().fieldErrors.email,
          adminPassword: adminParsed.error.flatten().fieldErrors.password,
        };

    return { error: { ...companyErrors, ...adminErrors } };
  }

  await db.transaction(async (tx) => {
    let user = await findUserByEmail(adminParsed.data.email, tx);

    if (!user) {
      user = await createUser(
        {
          ...adminParsed.data,
          platformRole: isSuperAdminEmail(adminParsed.data.email) ? "super_admin" : "user",
        },
        tx,
      );
    }

    const company = await createCompany(companyParsed.data, tx);
    const existingMembership = await getMembership(user.id, company.id, tx);

    if (!existingMembership) {
      await addMember(
        {
          companyId: company.id,
          userId: user.id,
          role: "admin",
        },
        tx,
      );
    }
  });

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
