import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { companyMembers, users } from "@/server/db/schema";

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

  const memberships = await db.query.companyMembers.findMany({
    where: eq(companyMembers.userId, user.id),
  });

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

export async function getMembership(userId: string, companyId: string) {
  return db.query.companyMembers.findFirst({
    where: and(eq(companyMembers.userId, userId), eq(companyMembers.companyId, companyId)),
  });
}
