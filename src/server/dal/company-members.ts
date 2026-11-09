import "server-only";

import { and, count, eq } from "drizzle-orm";

import type { CompanyMemberInput } from "@/schemas/company-members";
import { db, type DbTransaction } from "@/server/db";
import { companyMembers, users } from "@/server/db/schema";

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

export type CompanyMemberWithUser = {
  id: string;
  companyId: string;
  userId: string;
  role: "admin" | "member";
  createdAt: Date;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
};

export async function addMember(input: CompanyMemberInput, tx?: DbTransaction) {
  const [member] = await dbOrTx(tx)
    .insert(companyMembers)
    .values({
      companyId: input.companyId,
      userId: input.userId,
      role: input.role,
    })
    .returning();

  return member!;
}

export async function getMemberById(id: string, tx?: DbTransaction) {
  return dbOrTx(tx).query.companyMembers.findFirst({
    where: eq(companyMembers.id, id),
  });
}

export async function getMembership(userId: string, companyId: string, tx?: DbTransaction) {
  return dbOrTx(tx).query.companyMembers.findFirst({
    where: and(eq(companyMembers.userId, userId), eq(companyMembers.companyId, companyId)),
  });
}

export async function listMembershipsByUserId(userId: string, tx?: DbTransaction) {
  return dbOrTx(tx).query.companyMembers.findMany({
    where: eq(companyMembers.userId, userId),
  });
}

export async function listMembersWithUsers(
  companyId: string,
  tx?: DbTransaction,
): Promise<CompanyMemberWithUser[]> {
  const rows = await dbOrTx(tx)
    .select({
      id: companyMembers.id,
      companyId: companyMembers.companyId,
      userId: companyMembers.userId,
      role: companyMembers.role,
      createdAt: companyMembers.createdAt,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(companyMembers)
    .innerJoin(users, eq(companyMembers.userId, users.id))
    .where(eq(companyMembers.companyId, companyId))
    .orderBy(companyMembers.createdAt);

  return rows;
}

export async function countAdminsInCompany(
  companyId: string,
  tx?: DbTransaction,
): Promise<number> {
  const [result] = await dbOrTx(tx)
    .select({ total: count() })
    .from(companyMembers)
    .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.role, "admin")));

  return result?.total ?? 0;
}

export async function updateMemberRole(
  id: string,
  role: "admin" | "member",
  tx?: DbTransaction,
) {
  const [updated] = await dbOrTx(tx)
    .update(companyMembers)
    .set({ role })
    .where(eq(companyMembers.id, id))
    .returning();

  return updated;
}

export async function deleteMember(id: string, tx?: DbTransaction) {
  const [deleted] = await dbOrTx(tx)
    .delete(companyMembers)
    .where(eq(companyMembers.id, id))
    .returning();

  return deleted;
}
