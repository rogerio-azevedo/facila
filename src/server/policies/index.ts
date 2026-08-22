import type { AppContext, ClientContext } from "@/server/dal/context";

export type PolicyAction =
  | "platform:clients"
  | "platform:act-as"
  | "clients:manage"
  | "clients:read";

export function can(ctx: AppContext, action: PolicyAction): boolean {
  switch (action) {
    case "platform:clients":
      return ctx.kind === "platform" && ctx.role === "super_admin";

    case "platform:act-as":
      return ctx.kind === "platform" && ctx.role === "super_admin";

    case "clients:manage":
      if (ctx.kind === "platform") {
        return false;
      }
      return ctx.role === "admin" || ctx.role === "super_admin";

    case "clients:read":
      return ctx.kind === "client";

    default:
      return false;
  }
}

export function isClientAdmin(ctx: ClientContext) {
  return ctx.role === "admin" || ctx.role === "super_admin";
}
