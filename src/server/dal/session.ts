import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { clientMembers, users } from "@/server/db/schema";

type DbUser = typeof users.$inferSelect;

type SessionClientOptions = {
  activeClientId?: string | null;
  isActingAs?: boolean;
};

export async function resolveSessionClientContext(
  user: DbUser,
  options: SessionClientOptions = {},
) {
  if (user.platformRole === "super_admin") {
    if (options.activeClientId && options.isActingAs) {
      const client = await db.query.clients.findFirst({
        where: (clients, { eq: eqFn }) => eqFn(clients.id, options.activeClientId!),
      });

      if (client) {
        return {
          activeClientId: client.id,
          clientRole: null as "admin" | "member" | null,
          isActingAs: true,
        };
      }
    }

    return {
      activeClientId: null,
      clientRole: null as "admin" | "member" | null,
      isActingAs: false,
    };
  }

  const memberships = await db.query.clientMembers.findMany({
    where: eq(clientMembers.userId, user.id),
  });

  if (memberships.length === 0) {
    return {
      activeClientId: null,
      clientRole: null as "admin" | "member" | null,
      isActingAs: false,
    };
  }

  const preferred = options.activeClientId
    ? memberships.find((membership) => membership.clientId === options.activeClientId)
    : undefined;

  const active = preferred ?? memberships[0]!;

  return {
    activeClientId: active.clientId,
    clientRole: active.role,
    isActingAs: false,
  };
}

export async function getMembership(userId: string, clientId: string) {
  return db.query.clientMembers.findFirst({
    where: and(eq(clientMembers.userId, userId), eq(clientMembers.clientId, clientId)),
  });
}
