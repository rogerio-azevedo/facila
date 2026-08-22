import "server-only";

import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import type { ClientInput, ClientListQuery } from "@/schemas/clients";
import { db, type DbTransaction } from "@/server/db";
import { clients } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export type ClientListItem = {
  id: string;
  name: string;
  document: string;
  personType: "individual" | "organization";
  phone: string | null;
};

export type ClientListResult = {
  items: ClientListItem[];
  total: number;
};

export type ClientRecord = typeof clients.$inferSelect;

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

function buildListWhere(companyId: string, query: ClientListQuery) {
  const conditions = [eq(clients.companyId, companyId)];

  if (query.personType) {
    conditions.push(eq(clients.personType, query.personType));
  }

  if (query.q) {
    const documentDigits = query.q.replace(/\D/g, "");

    if (documentDigits) {
      conditions.push(
        or(ilike(clients.name, `%${query.q}%`), ilike(clients.document, `%${documentDigits}%`))!,
      );
    } else {
      conditions.push(ilike(clients.name, `%${query.q}%`));
    }
  }

  return and(...conditions);
}

export async function listClients(query: ClientListQuery): Promise<ClientListResult> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "clients:read")) {
    throw new ForbiddenError();
  }

  const where = buildListWhere(ctx.companyId, query);
  const offset = (query.page - 1) * query.pageSize;

  const [countRow, rows] = await Promise.all([
    db.select({ total: count() }).from(clients).where(where),
    db
      .select({
        id: clients.id,
        name: clients.name,
        document: clients.document,
        personType: clients.personType,
        phone: clients.phone,
      })
      .from(clients)
      .where(where)
      .orderBy(desc(clients.createdAt))
      .limit(query.pageSize)
      .offset(offset),
  ]);

  return {
    items: rows,
    total: countRow[0]?.total ?? 0,
  };
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
