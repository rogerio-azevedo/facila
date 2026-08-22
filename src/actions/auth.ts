"use server";

import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { companyNameSchema } from "@/schemas/companies";
import { AuthFormState, loginSchema } from "@/schemas/auth";
import { userSchema } from "@/schemas/users";
import { signIn, signOut } from "@/server/auth";
import { addMember } from "@/server/dal/company-members";
import { createCompany } from "@/server/dal/companies";
import {
  createUser,
  getPostLoginRedirect,
  isSuperAdminEmail,
  registerSuperAdmin,
} from "@/server/dal/users";
import { db } from "@/server/db";

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const redirectTo = await getPostLoginRedirect(parsed.data.email);

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      return { message: "E-mail ou senha inválidos." };
    }

    return { message: "Não foi possível entrar. Tente novamente." };
  }

  return { success: true };
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const userParsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const companyParsed = companyNameSchema.safeParse({
    name: formData.get("companyName"),
  });

  if (!userParsed.success || !companyParsed.success) {
    const userErrors = userParsed.success ? {} : userParsed.error.flatten().fieldErrors;
    const companyErrors = companyParsed.success
      ? {}
      : { companyName: companyParsed.error.flatten().fieldErrors.name };

    return {
      errors: {
        ...userErrors,
        ...companyErrors,
      },
    };
  }

  const redirectTo = isSuperAdminEmail(userParsed.data.email)
    ? "/platform/companies"
    : "/dashboard";

  try {
    if (isSuperAdminEmail(userParsed.data.email)) {
      await registerSuperAdmin(userParsed.data);
    } else {
      await db.transaction(async (tx) => {
        const user = await createUser(userParsed.data, tx);
        const company = await createCompany(companyParsed.data, tx);
        await addMember(
          {
            companyId: company.id,
            userId: user.id,
            role: "admin",
          },
          tx,
        );
      });
    }

    await signIn("credentials", {
      email: userParsed.data.email,
      password: userParsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof Error && error.message.includes("unique")) {
      return { message: "Este e-mail já está cadastrado." };
    }

    return { message: "Não foi possível criar a conta. Tente novamente." };
  }

  return { success: true };
}

export async function loginWithGoogleAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
