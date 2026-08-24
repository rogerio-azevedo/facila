import type { AppContext, CompanyContext } from "@/server/dal/context";

export type PolicyAction =
  | "platform:companies"
  | "platform:act-as"
  | "companies:manage"
  | "clients:manage"
  | "clients:read"
  | "contracts:manage"
  | "contracts:read"
  | "accounts-receivable:manage"
  | "accounts-receivable:read"
  | "billing-runs:manage"
  | "billing-runs:read"
  | "issuers:manage"
  | "issuers:read";

export function can(ctx: AppContext, action: PolicyAction): boolean {
  switch (action) {
    case "platform:companies":
      return ctx.kind === "platform" && ctx.role === "super_admin";

    case "platform:act-as":
      return ctx.kind === "platform" && ctx.role === "super_admin";

    case "companies:manage":
      if (ctx.kind === "platform") {
        return false;
      }
      return ctx.role === "admin" || ctx.role === "super_admin";

    case "clients:manage":
    case "clients:read":
    case "contracts:manage":
    case "contracts:read":
    case "accounts-receivable:manage":
    case "accounts-receivable:read":
    case "billing-runs:manage":
    case "billing-runs:read":
    case "issuers:manage":
    case "issuers:read":
      return ctx.kind === "company";

    default:
      return false;
  }
}

export function isCompanyAdmin(ctx: CompanyContext) {
  return ctx.role === "admin" || ctx.role === "super_admin";
}
