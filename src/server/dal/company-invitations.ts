import "server-only";

import { and, desc, eq, isNull, gt } from "drizzle-orm";

import { db, type DbTransaction } from "@/server/db";
import { companyInvitations } from "@/server/db/schema";

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

export type CompanyInvitationRecord = typeof companyInvitations.$inferSelect;

export type CreateInvitationInput = {
  companyId: string;
  email: string;
  role: "admin" | "member";
  token: string;
  invitedByUserId: string;
  expiresAt: Date;
};

export async function createInvitation(
  input: CreateInvitationInput,
  tx?: DbTransaction,
): Promise<CompanyInvitationRecord> {
  const [invitation] = await dbOrTx(tx)
    .insert(companyInvitations)
    .values({
      companyId: input.companyId,
      email: input.email.toLowerCase(),
      role: input.role,
      token: input.token,
      invitedByUserId: input.invitedByUserId,
      expiresAt: input.expiresAt,
    })
    .returning();

  return invitation!;
}

export async function getInvitationByToken(
  token: string,
  tx?: DbTransaction,
): Promise<CompanyInvitationRecord | undefined> {
  return dbOrTx(tx).query.companyInvitations.findFirst({
    where: eq(companyInvitations.token, token),
  });
}

export async function getInvitationById(
  id: string,
  tx?: DbTransaction,
): Promise<CompanyInvitationRecord | undefined> {
  return dbOrTx(tx).query.companyInvitations.findFirst({
    where: eq(companyInvitations.id, id),
  });
}

export async function listInvitationsByCompanyId(
  companyId: string,
  tx?: DbTransaction,
): Promise<CompanyInvitationRecord[]> {
  return dbOrTx(tx).query.companyInvitations.findMany({
    where: eq(companyInvitations.companyId, companyId),
    orderBy: [desc(companyInvitations.createdAt)],
  });
}

export async function findPendingInvitation(
  email: string,
  companyId: string,
  tx?: DbTransaction,
): Promise<CompanyInvitationRecord | undefined> {
  const now = new Date();
  return dbOrTx(tx).query.companyInvitations.findFirst({
    where: and(
      eq(companyInvitations.email, email.toLowerCase()),
      eq(companyInvitations.companyId, companyId),
      isNull(companyInvitations.acceptedAt),
      isNull(companyInvitations.revokedAt),
      gt(companyInvitations.expiresAt, now),
    ),
  });
}

export async function revokeInvitation(
  id: string,
  tx?: DbTransaction,
): Promise<CompanyInvitationRecord | undefined> {
  const [updated] = await dbOrTx(tx)
    .update(companyInvitations)
    .set({ revokedAt: new Date() })
    .where(eq(companyInvitations.id, id))
    .returning();

  return updated;
}

export async function markInvitationAccepted(
  id: string,
  tx?: DbTransaction,
): Promise<CompanyInvitationRecord | undefined> {
  const [updated] = await dbOrTx(tx)
    .update(companyInvitations)
    .set({ acceptedAt: new Date() })
    .where(eq(companyInvitations.id, id))
    .returning();

  return updated;
}

