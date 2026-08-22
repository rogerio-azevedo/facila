import "server-only";

import { and, eq } from "drizzle-orm";

import type { CompanyMemberInput } from "@/schemas/company-members";
import { db, type DbTransaction } from "@/server/db";
import { companyMembers } from "@/server/db/schema";

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

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
