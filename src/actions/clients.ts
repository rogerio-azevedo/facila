"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addressSchema } from "@/schemas/addresses";
import { clientSchema, type ClientFormState } from "@/schemas/clients";
import { createAddress, upsertPrimaryAddressForClient } from "@/server/dal/addresses";
import {
  createClient,
  isDuplicateClientDocumentError,
  updateClient,
} from "@/server/dal/clients";
import { db } from "@/server/db";

export async function createClientWithAddressAction(input: unknown): Promise<ClientFormState> {
  const payload = input as { client?: unknown; address?: unknown };
  const clientParsed = clientSchema.safeParse(payload.client);
  const addressParsed = addressSchema.safeParse(payload.address);

  if (!clientParsed.success || !addressParsed.success) {
    return {
      errors: {
        client: clientParsed.success ? undefined : clientParsed.error.flatten().fieldErrors,
        address: addressParsed.success ? undefined : addressParsed.error.flatten().fieldErrors,
      },
    };
  }

  try {
    await db.transaction(async (tx) => {
      const client = await createClient(clientParsed.data, tx);
      await createAddress(
        { ...addressParsed.data, clientOwnerId: client.id },
        tx,
      );
    });
  } catch (error) {
    if (isDuplicateClientDocumentError(error)) {
      return {
        errors: {
          client: { document: ["Documento já cadastrado para esta empresa"] },
        },
      };
    }
    throw error;
  }

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClientWithAddressAction(
  clientId: string,
  input: unknown,
): Promise<ClientFormState> {
  const payload = input as { client?: unknown; address?: unknown };
  const clientParsed = clientSchema.safeParse(payload.client);
  const addressParsed = addressSchema.safeParse(payload.address);

  if (!clientParsed.success || !addressParsed.success) {
    return {
      errors: {
        client: clientParsed.success ? undefined : clientParsed.error.flatten().fieldErrors,
        address: addressParsed.success ? undefined : addressParsed.error.flatten().fieldErrors,
      },
    };
  }

  try {
    await db.transaction(async (tx) => {
      const updated = await updateClient(clientId, clientParsed.data, tx);
      if (!updated) {
        throw new Error("not-found");
      }
      await upsertPrimaryAddressForClient(clientId, addressParsed.data, tx);
    });
  } catch (error) {
    if (error instanceof Error && error.message === "not-found") {
      return { errors: { form: ["Cliente não encontrado"] } };
    }
    if (isDuplicateClientDocumentError(error)) {
      return {
        errors: {
          client: { document: ["Documento já cadastrado para esta empresa"] },
        },
      };
    }
    throw error;
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}
