import "server-only";

import { and, desc, eq } from "drizzle-orm";

import type { ClientInput } from "@/schemas/clients";
import { db, type DbTransaction } from "@/server/db";
import { clients } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export type ClientListItem = {
  id: string;
  name: string;
  document: string;
  personType: "individual" | "organization";
  email: string | null;
};

export type ClientRecord = typeof clients.$inferSelect;

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

export async function listClients(): Promise<ClientListItem[]> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "clients:read")) {
    throw new ForbiddenError();
  }

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      document: clients.document,
      personType: clients.personType,
      email: clients.email,
    })
    .from(clients)
    .where(eq(clients.companyId, ctx.companyId))
    .orderBy(desc(clients.createdAt));

  return rows;
}

export async function getClientById(clientId: string): Promise<ClientRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "clients:read")) {
    throw new ForbiddenError();
  }

  const row = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId)),
  });

  return row ?? null;
}

export async function createClient(
  input: ClientInput,
  tx?: DbTransaction,
): Promise<ClientRecord> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "clients:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .insert(clients)
    .values({
      companyId: ctx.companyId,
      name: input.name,
      personType: input.personType,
      document: input.document,
      legalName: input.legalName,
      tradeName: input.tradeName,
      stateRegistration: input.stateRegistration,
      icmsTaxpayerIndicator: input.icmsTaxpayerIndicator,
      municipalRegistration: input.municipalRegistration,
      email: input.email,
      phone: input.phone,
    })
    .returning();

  return row;
}

export async function updateClient(
  clientId: string,
  input: ClientInput,
  tx?: DbTransaction,
): Promise<ClientRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "clients:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .update(clients)
    .set({
      name: input.name,
      personType: input.personType,
      document: input.document,
      legalName: input.legalName,
      tradeName: input.tradeName,
      stateRegistration: input.stateRegistration,
      icmsTaxpayerIndicator: input.icmsTaxpayerIndicator,
      municipalRegistration: input.municipalRegistration,
      email: input.email,
      phone: input.phone,
      updatedAt: new Date(),
    })
    .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId)))
    .returning();

  return row ?? null;
}

export class DuplicateClientDocumentError extends Error {
  constructor() {
    super("duplicate-document");
    this.name = "DuplicateClientDocumentError";
  }
}

export function isDuplicateClientDocumentError(error: unknown): boolean {
  return (
    error instanceof DuplicateClientDocumentError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "23505")
  );
}
