import { z } from "zod";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const addressOwnerTypeSchema = z.enum(["company", "client", "issuer"]);
export const addressTypeSchema = z.enum(["main", "billing", "shipping"]);

export const addressSchema = z
  .object({
    street: z.string().min(1, { error: "Logradouro obrigatório" }).max(200).trim(),
    number: z.string().min(1, { error: "Número obrigatório" }).max(20).trim(),
    complement: z.string().max(100).trim().optional().or(z.literal("")),
    neighborhood: z.string().min(1, { error: "Bairro obrigatório" }).max(100).trim(),
    city: z.string().min(1, { error: "Cidade obrigatória" }).max(100).trim(),
    state: z
      .string()
      .length(2, { error: "UF deve ter 2 letras" })
      .transform((v) => v.toUpperCase()),
    postalCode: z
      .string()
      .min(1, { error: "CEP obrigatório" })
      .transform(digitsOnly)
      .refine((v) => v.length === 8, { message: "CEP deve ter 8 dígitos" }),
    codMunicipioIbge: z
      .string()
      .min(1, { error: "Código IBGE obrigatório (preencha o CEP)" })
      .transform(digitsOnly)
      .refine((v) => v.length === 7, { message: "Código IBGE inválido" }),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    type: addressTypeSchema.default("main"),
    ownerType: addressOwnerTypeSchema.default("client"),
  })
  .transform((data) => ({
    ...data,
    complement: data.complement || undefined,
    country: "Brasil" as const,
  }));

export const geocodeAddressInputSchema = z.object({
  street: z.string().min(1),
  number: z.string().min(1),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  postalCode: z.string().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type GeocodeAddressInput = z.infer<typeof geocodeAddressInputSchema>;

export type AddressFormState = {
  error?: string;
  lat?: number;
  lng?: number;
};
