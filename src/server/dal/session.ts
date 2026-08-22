import "server-only";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { listMembershipsByUserId } from "@/server/dal/company-members";

type DbUser = typeof users.$inferSelect;

type SessionCompanyOptions = {
  activeCompanyId?: string | null;
  isActingAs?: boolean;
};

export async function resolveSessionCompanyContext(
  user: DbUser,
  options: SessionCompanyOptions = {},
) {
  if (user.platformRole === "super_admin") {
    if (options.activeCompanyId && options.isActingAs) {
      const company = await db.query.companies.findFirst({
        where: (companies, { eq: eqFn }) => eqFn(companies.id, options.activeCompanyId!),
      });

      if (company) {
        return {
          activeCompanyId: company.id,
          companyRole: null as "admin" | "member" | null,
          isActingAs: true,
        };
      }
    }

    return {
      activeCompanyId: null,
      companyRole: null as "admin" | "member" | null,
      isActingAs: false,
    };
  }

  const memberships = await listMembershipsByUserId(user.id);

  if (memberships.length === 0) {
    return {
      activeCompanyId: null,
      companyRole: null as "admin" | "member" | null,
      isActingAs: false,
    };
  }

  const preferred = options.activeCompanyId
    ? memberships.find((membership) => membership.companyId === options.activeCompanyId)
    : undefined;

  const active = preferred ?? memberships[0]!;

  return {
    activeCompanyId: active.companyId,
    companyRole: active.role,
    isActingAs: false,
  };
}

export { getMembership } from "@/server/dal/company-members";
