"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateSession } from "@/server/auth";
import { createClientAsSuperAdmin, getClientById } from "@/server/dal/clients";
import {
  ForbiddenError,
  requireAuthContext,
  requirePlatformContext,
} from "@/server/dal/context";
import { getMembership } from "@/server/dal/session";
import { can } from "@/server/policies";
import { actAsClientSchema, createClientSchema } from "@/schemas/auth";

export async function createClientAction(input: unknown) {
  const ctx = await requirePlatformContext();
  if (!can(ctx, "platform:clients")) {
    throw new ForbiddenError();
  }

  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await createClientAsSuperAdmin(parsed.data);
  revalidatePath("/platform/clients");
  return { success: true };
}

export async function createClientFormAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const result = await createClientAction({
    name: formData.get("name"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });

  if ("error" in result && result.error) {
    return { error: "Dados inválidos" };
  }

  return { success: true };
}

export async function actAsClientAction(input: unknown) {
  const ctx = await requireAuthContext();
  if (!can(ctx, "platform:act-as")) {
    throw new ForbiddenError();
  }

  const parsed = actAsClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Cliente inválido" };
  }

  const client = await getClientById(parsed.data.clientId);
  if (!client) {
    return { error: "Cliente não encontrado" };
  }

  await updateSession({
    user: {
      activeClientId: client.id,
      clientRole: null,
      isActingAs: true,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function actAsClientFormAction(formData: FormData) {
  const clientId = formData.get("clientId");
  await actAsClientAction({ clientId });
}

export async function stopActAsClientAction() {
  const ctx = await requireAuthContext();
  if (ctx.kind !== "client" || !ctx.isActingAs) {
    throw new ForbiddenError();
  }

  await updateSession({
    user: {
      activeClientId: null,
      clientRole: null,
      isActingAs: false,
    },
  });

  revalidatePath("/platform/clients");
  redirect("/platform/clients");
}

export async function switchClientAction(clientId: string) {
  const session = await requireAuthContext();

  if (session.kind === "platform") {
    return actAsClientAction({ clientId });
  }

  const membership = await getMembership(session.userId, clientId);
  if (!membership) {
    throw new ForbiddenError();
  }

  await updateSession({
    user: {
      activeClientId: clientId,
      clientRole: membership.role,
      isActingAs: false,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
