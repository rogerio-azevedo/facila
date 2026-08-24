"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addressSchema } from "@/schemas/addresses";
import { issuerServiceProfileSchema } from "@/schemas/issuer-service-profiles";
import { issuerSchema, issuerUpdateSchema, type IssuerFormState } from "@/schemas/issuers";
import {
  createIssuerAddress,
  upsertPrimaryAddressForIssuer,
} from "@/server/dal/addresses";
import { createIssuerServiceProfile } from "@/server/dal/issuer-service-profiles";
import {
  createIssuer,
  ensureIssuerCnae,
  isDuplicateIssuerCnpjError,
  updateIssuer,
} from "@/server/dal/issuers";
import { db } from "@/server/db";

export async function createIssuerWithAddressAction(input: unknown): Promise<IssuerFormState> {
  const payload = input as {
    issuer?: unknown;
    address?: unknown;
    serviceProfiles?: unknown;
  };
  const issuerParsed = issuerSchema.safeParse(payload.issuer);
  const addressParsed = addressSchema.safeParse({
    ...(payload.address as object),
    ownerType: "issuer",
  });
  const serviceProfilesParsed = Array.isArray(payload.serviceProfiles)
    ? payload.serviceProfiles.map((item) => issuerServiceProfileSchema.safeParse(item))
    : [];

  if (!issuerParsed.success || !addressParsed.success) {
    return {
      errors: {
        issuer: issuerParsed.success ? undefined : issuerParsed.error.flatten().fieldErrors,
        address: addressParsed.success ? undefined : addressParsed.error.flatten().fieldErrors,
      },
    };
  }

  const invalidProfile = serviceProfilesParsed.find((item) => !item.success);
  if (invalidProfile && !invalidProfile.success) {
    return {
      errors: {
        form: [invalidProfile.error.issues[0]?.message ?? "Tributação inválida"],
      },
    };
  }

  try {
    const issuer = await db.transaction(async (tx) => {
      const created = await createIssuer(issuerParsed.data, tx);
      await createIssuerAddress(
        { ...addressParsed.data, issuerOwnerId: created.id },
        tx,
      );

      for (const profile of serviceProfilesParsed) {
        if (profile.success) {
          const createdProfile = await createIssuerServiceProfile(created.id, profile.data, tx);
          await ensureIssuerCnae(created.id, createdProfile.cnaeCode, {
            isPrimary: createdProfile.isDefault,
          }, tx);
        }
      }

      return created;
    });

    revalidatePath("/issuers");
    redirect(`/issuers/${issuer.id}`);
  } catch (error) {
    if (isDuplicateIssuerCnpjError(error)) {
      return {
        errors: {
          issuer: { cnpj: ["CNPJ já cadastrado para esta empresa"] },
        },
      };
    }
    throw error;
  }
}

export async function updateIssuerWithAddressAction(
  issuerId: string,
  input: unknown,
): Promise<IssuerFormState> {
  const payload = input as { issuer?: unknown; address?: unknown };
  const issuerParsed = issuerUpdateSchema.safeParse(payload.issuer);
  const addressParsed = addressSchema.safeParse({
    ...(payload.address as object),
    ownerType: "issuer",
  });

  if (!issuerParsed.success || !addressParsed.success) {
    return {
      errors: {
        issuer: issuerParsed.success ? undefined : issuerParsed.error.flatten().fieldErrors,
        address: addressParsed.success ? undefined : addressParsed.error.flatten().fieldErrors,
      },
    };
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const row = await updateIssuer(issuerId, issuerParsed.data, tx);
      if (!row) {
        throw new Error("not-found");
      }
      await upsertPrimaryAddressForIssuer(issuerId, addressParsed.data, tx);
      return row;
    });

    if (!updated) {
      return { errors: { form: ["Emissor não encontrado"] } };
    }
  } catch (error) {
    if (error instanceof Error && error.message === "not-found") {
      return { errors: { form: ["Emissor não encontrado"] } };
    }
    if (isDuplicateIssuerCnpjError(error)) {
      return {
        errors: {
          issuer: { cnpj: ["CNPJ já cadastrado para esta empresa"] },
        },
      };
    }
    throw error;
  }

  revalidatePath("/issuers");
  revalidatePath(`/issuers/${issuerId}`);
  return { success: true };
}

export async function setIssuerEnvironmentAction(
  issuerId: string,
  environment: "homologacao" | "producao",
) {
  const { updateIssuerEnvironment } = await import("@/server/dal/issuers");
  await updateIssuerEnvironment(issuerId, environment);
  revalidatePath(`/issuers/${issuerId}`);
  revalidatePath("/issuers");
}
