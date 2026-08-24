import "server-only";

import type { PendingEvent, RetryStore } from "open-nfse";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { nfseRetryEntries } from "@/server/db/schema";

type StoredPendingEvent = PendingEvent;

function serialize(entry: StoredPendingEvent) {
  return JSON.stringify({
    ...entry,
    firstAttemptAt: entry.firstAttemptAt.toISOString(),
    lastAttemptAt: entry.lastAttemptAt.toISOString(),
    notBefore: entry.notBefore?.toISOString(),
  });
}

function deserialize(payload: string): StoredPendingEvent {
  const parsed = JSON.parse(payload) as StoredPendingEvent & {
    firstAttemptAt: string;
    lastAttemptAt: string;
    notBefore?: string;
  };

  return {
    ...parsed,
    firstAttemptAt: new Date(parsed.firstAttemptAt),
    lastAttemptAt: new Date(parsed.lastAttemptAt),
    notBefore: parsed.notBefore ? new Date(parsed.notBefore) : undefined,
  };
}

export class PostgresRetryStore implements RetryStore {
  async save(entry: PendingEvent): Promise<void> {
    const now = new Date();

    await db
      .insert(nfseRetryEntries)
      .values({
        id: entry.id,
        payload: serialize(entry),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: nfseRetryEntries.id,
        set: {
          payload: serialize(entry),
          updatedAt: now,
        },
      });
  }

  async list(): Promise<readonly PendingEvent[]> {
    const rows = await db.select().from(nfseRetryEntries).orderBy(nfseRetryEntries.updatedAt);

    return rows.map((row) => deserialize(row.payload));
  }

  async delete(id: string): Promise<void> {
    await db.delete(nfseRetryEntries).where(eq(nfseRetryEntries.id, id));
  }
}

export const postgresRetryStore = new PostgresRetryStore();
