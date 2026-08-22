import "server-only";

import { auth } from "@/server/auth";

export type PlatformContext = {
  kind: "platform";
  userId: string;
  role: "super_admin";
};

export type CompanyContext = {
  kind: "company";
  userId: string;
  companyId: string;
  role: "admin" | "member" | "super_admin";
  isActingAs: boolean;
};

export type AppContext = PlatformContext | CompanyContext;

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function getCurrentContext(): Promise<AppContext | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const { id, platformRole, activeCompanyId, companyRole, isActingAs } = session.user;

  if (platformRole === "super_admin") {
    if (activeCompanyId && isActingAs) {
      return {
        kind: "company",
        userId: id,
        companyId: activeCompanyId,
        role: "super_admin",
        isActingAs: true,
      };
    }

    return {
      kind: "platform",
      userId: id,
      role: "super_admin",
    };
  }

  if (!activeCompanyId || !companyRole) {
    return null;
  }

  return {
    kind: "company",
    userId: id,
    companyId: activeCompanyId,
    role: companyRole,
    isActingAs: false,
  };
}

export async function requireAuthContext(): Promise<AppContext> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    throw new AuthError();
  }
  return ctx;
}

export async function requirePlatformContext(): Promise<PlatformContext> {
  const ctx = await requireAuthContext();
  if (ctx.kind !== "platform") {
    throw new ForbiddenError("Platform access required");
  }
  return ctx;
}

export async function requireCompanyContext(): Promise<CompanyContext> {
  const ctx = await requireAuthContext();
  if (ctx.kind !== "company") {
    throw new ForbiddenError("Active company required");
  }
  return ctx;
}
