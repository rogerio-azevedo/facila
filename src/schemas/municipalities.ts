import { z } from "zod";

export const municipalitySearchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type MunicipalitySearchInput = z.infer<typeof municipalitySearchSchema>;

export const referenceCodeSearchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ReferenceCodeSearchInput = z.infer<typeof referenceCodeSearchSchema>;

export const municipalityNfseStatusLabels = {
  not_started: "Não iniciado",
  homologating: "Homologando",
  live: "Operacional",
} as const;
