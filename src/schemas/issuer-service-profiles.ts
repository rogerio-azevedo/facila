import { z } from "zod";

import { parsePercent } from "@/lib/parse-percent";
import { normalizeMunicipalTaxCode } from "@/lib/normalize-municipal-tax-code";

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value === "" ? undefined : value));

export const issuerServiceProfileSchema = z.object({
  name: z.string().min(1, { error: "Nome obrigatório" }).max(120).trim(),
  description: z.string().max(500).trim().optional().or(z.literal("")),
  cnaeCode: z
    .string()
    .min(1, { error: "CNAE obrigatório" })
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 7, { message: "CNAE inválido" }),
  nationalServiceCode: z.string().min(1, { error: "Código de tributação obrigatório" }),
  issRate: z.coerce
    .number()
    .min(0, { error: "Alíquota ISS inválida" })
    .max(100, { error: "Alíquota ISS inválida" }),
  issRetained: z.boolean().default(false),
  issqnCst: z
    .string()
    .trim()
    .regex(/^\d{3}$/, { message: "CST inválido" })
    .default("000"),
  municipalTaxCode: z.preprocess(
    (value) => normalizeMunicipalTaxCode(typeof value === "string" ? value : undefined),
    z
      .string()
      .regex(/^\d{1,7}$/, {
        message: "Código ISS municipal inválido",
      })
      .optional(),
  ),
  nbsCode: optionalText,
  pTotTribSn: z.preprocess(
    (value) => parsePercent(value),
    z.number().min(0).max(100).optional(),
  ),
  cClassTrib: optionalText,
  cIndOp: optionalText,
  indDest: optionalText,
  finNfse: optionalText,
  indFinal: optionalText,
  isDefault: z.boolean().default(false),
});

export type IssuerServiceProfileInput = z.infer<typeof issuerServiceProfileSchema>;

export type IssuerServiceProfileFormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};
