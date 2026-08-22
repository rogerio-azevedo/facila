"use server";

import { revalidatePath } from "next/cache";

import { addressSchema } from "@/schemas/addresses";
import { upsertPrimaryAddressForClient } from "@/server/dal/addresses";

/**
 * Mutação isolada de endereço primário de um client.
 * Reservado para fluxos futuros (ex.: editar só endereço).
 * O CRUD atual usa createClientWithAddressAction / updateClientWithAddressAction.
 */
export async function updatePrimaryAddressForClientAction(
  clientId: string,
  input: unknown,
): Promise<{ error?: string; success?: boolean }> {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Dados de endereço inválidos" };
  }

  await upsertPrimaryAddressForClient(clientId, parsed.data);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  return { success: true };
}
