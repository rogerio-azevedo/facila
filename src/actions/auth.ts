"use server";

import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { signIn, signOut } from "@/server/auth";
import { registerCompanyWithAdmin } from "@/server/dal/companies";
import { getPostLoginRedirect, isSuperAdminEmail, registerSuperAdmin } from "@/server/dal/users";
import { AuthFormState, loginSchema, registerSchema } from "@/schemas/auth";

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
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    companyName: formData.get("companyName"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const redirectTo = isSuperAdminEmail(parsed.data.email)
    ? "/platform/companies"
    : "/dashboard";

  try {
    if (isSuperAdminEmail(parsed.data.email)) {
      await registerSuperAdmin({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      });
    } else {
      await registerCompanyWithAdmin(parsed.data);
    }

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
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
