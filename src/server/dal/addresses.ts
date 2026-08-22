import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import type { AddressInput } from "@/schemas/addresses";
import { db, type DbTransaction } from "@/server/db";
import { addresses } from "@/server/db/schema";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export type AddressRecord = typeof addresses.$inferSelect;

export type ClientPrimaryAddressSummary = {
  clientId: string;
  city: string;
  state: string;
};

function dbOrTx(tx?: DbTransaction) {
  return tx ?? db;
}

export async function listPrimaryAddressesByClientIds(
  clientIds: string[],
): Promise<ClientPrimaryAddressSummary[]> {
  if (clientIds.length === 0) {
    return [];
  }

  const ctx = await requireCompanyContext();
  if (!can(ctx, "clients:read")) {
    throw new ForbiddenError();
  }

  const rows = await db
    .select({
      clientId: addresses.clientOwnerId,
      city: addresses.city,
      state: addresses.state,
    })
    .from(addresses)
    .where(
      and(
        eq(addresses.companyId, ctx.companyId),
        eq(addresses.ownerType, "client"),
        eq(addresses.isPrimary, true),
        inArray(addresses.clientOwnerId, clientIds),
      ),
    );

  return rows.flatMap((row) =>
    row.clientId
      ? [{ clientId: row.clientId, city: row.city, state: row.state }]
      : [],
  );
}

export async function getPrimaryAddressForClient(
  clientId: string,
): Promise<AddressRecord | null> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "clients:read")) {
    throw new ForbiddenError();
  }

  const row = await db.query.addresses.findFirst({
    where: and(
      eq(addresses.companyId, ctx.companyId),
      eq(addresses.ownerType, "client"),
      eq(addresses.clientOwnerId, clientId),
      eq(addresses.isPrimary, true),
    ),
  });

  return row ?? null;
}

type CreateAddressParams = AddressInput & {
  clientOwnerId: string;
};

export async function createAddress(
  input: CreateAddressParams,
  tx?: DbTransaction,
): Promise<AddressRecord> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "clients:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const [row] = await database
    .insert(addresses)
    .values({
      companyId: ctx.companyId,
      ownerType: "client",
      clientOwnerId: input.clientOwnerId,
      type: input.type,
      isPrimary: true,
      street: input.street,
      number: input.number,
      complement: input.complement,
      neighborhood: input.neighborhood,
      city: input.city,
      state: input.state,
      country: input.country,
      postalCode: input.postalCode,
      codMunicipioIbge: input.codMunicipioIbge,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    })
    .returning();

  return row;
}

export async function upsertPrimaryAddressForClient(
  clientId: string,
  input: AddressInput,
  tx?: DbTransaction,
): Promise<AddressRecord> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "clients:manage")) {
    throw new ForbiddenError();
  }

  const database = dbOrTx(tx);

  const existing = await database.query.addresses.findFirst({
    where: and(
      eq(addresses.companyId, ctx.companyId),
      eq(addresses.ownerType, "client"),
      eq(addresses.clientOwnerId, clientId),
      eq(addresses.isPrimary, true),
    ),
  });

  if (existing) {
    const [row] = await database
      .update(addresses)
      .set({
        street: input.street,
        number: input.number,
        complement: input.complement,
        neighborhood: input.neighborhood,
        city: input.city,
        state: input.state,
        country: input.country,
        postalCode: input.postalCode,
        codMunicipioIbge: input.codMunicipioIbge,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        type: input.type,
        updatedAt: new Date(),
      })
      .where(eq(addresses.id, existing.id))
      .returning();

    return row!;
  }

  return createAddress({ ...input, clientOwnerId: clientId }, tx);
}
