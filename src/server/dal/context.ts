import "server-only";

import { auth } from "@/server/auth";

export type PlatformContext = {
  kind: "platform";
  userId: string;
  role: "super_admin";
};

export type ClientContext = {
  kind: "client";
  userId: string;
  clientId: string;
  role: "admin" | "member" | "super_admin";
  isActingAs: boolean;
};

export type AppContext = PlatformContext | ClientContext;

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

  const { id, platformRole, activeClientId, clientRole, isActingAs } = session.user;

  if (platformRole === "super_admin") {
    if (activeClientId && isActingAs) {
      return {
        kind: "client",
        userId: id,
        clientId: activeClientId,
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

  if (!activeClientId || !clientRole) {
    return null;
  }

  return {
    kind: "client",
    userId: id,
    clientId: activeClientId,
    role: clientRole,
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

export async function requireClientContext(): Promise<ClientContext> {
  const ctx = await requireAuthContext();
  if (ctx.kind !== "client") {
    throw new ForbiddenError("Active client required");
  }
  return ctx;
}
