import { z } from "zod";

import { digitsOnly, isValidCnpj } from "@/lib/validate-document";

export const issuerStatusSchema = z.enum(["active", "inactive"]);
export const issuerEnvironmentSchema = z.enum(["homologacao", "producao"]);

export const issuerCnaeInputSchema = z.object({
  code: z
    .string()
    .min(1, { error: "CNAE obrigatório" })
    .transform(digitsOnly)
    .refine((v) => v.length === 7, { message: "CNAE deve ter 7 dígitos" }),
  isPrimary: z.boolean().default(false),
});

const issuerBaseSchema = z.object({
  legalName: z.string().min(1, { error: "Razão social obrigatória" }).max(200).trim(),
  tradeName: z.string().max(200).trim().optional().or(z.literal("")),
  cnpj: z
    .string()
    .min(1, { error: "CNPJ obrigatório" })
    .transform(digitsOnly)
    .refine((v) => v.length === 14 && isValidCnpj(v), { message: "CNPJ inválido" }),
  municipalRegistration: z.string().max(20).trim().optional().or(z.literal("")),
  stateRegistration: z.string().max(20).trim().optional().or(z.literal("")),
  codMunicipioIbge: z
    .string()
    .min(1, { error: "Município obrigatório" })
    .transform(digitsOnly)
    .refine((v) => v.length === 7, { message: "Código IBGE inválido" }),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v))
    .pipe(z.email({ error: "E-mail inválido" }).optional()),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      const digits = digitsOnly(v ?? "");
      return digits === "" ? undefined : digits;
    }),
  opSimpNac: z.enum(["1", "2", "3"]).default("1"),
  regApTribSn: z
    .enum(["1", "2", "3"])
    .optional()
    .or(z.literal("")),
  regEspTrib: z.enum(["0", "1", "2", "3", "4", "5", "6"]).default("0"),
  incentivadorCultural: z.boolean().default(false),
  dpsSeries: z.string().min(1).max(5).default("1"),
  nextDpsNumber: z.coerce
    .number()
    .int({ message: "Próximo RPS deve ser um número inteiro" })
    .min(1, { message: "Próximo RPS deve ser no mínimo 1" }),
  environment: issuerEnvironmentSchema.default("homologacao"),
  status: issuerStatusSchema.default("active"),
  isDefault: z.boolean().default(false),
  certificatePassword: z.string().optional().or(z.literal("")),
});

function transformIssuerBase(data: z.infer<typeof issuerBaseSchema>) {
  return {
    ...data,
    tradeName: data.tradeName || undefined,
    municipalRegistration: data.municipalRegistration || undefined,
    stateRegistration: data.stateRegistration || undefined,
    regApTribSn: data.regApTribSn || undefined,
    certificatePassword: data.certificatePassword || undefined,
  };
}

function refineIssuerFiscalFields(
  data: z.infer<typeof issuerBaseSchema>,
  ctx: z.RefinementCtx,
) {
  if (data.opSimpNac === "3" && !data.regApTribSn) {
    ctx.addIssue({
      code: "custom",
      message: "Regime de apuração do Simples Nacional é obrigatório para ME/EPP",
      path: ["regApTribSn"],
    });
  }
}

export const issuerUpdateSchema = issuerBaseSchema
  .superRefine(refineIssuerFiscalFields)
  .transform(transformIssuerBase);

export const issuerSchema = issuerBaseSchema
  .extend({
    cnaes: z.array(issuerCnaeInputSchema).min(1, { error: "Informe ao menos um CNAE" }),
  })
  .superRefine((data, ctx) => {
    const primaryCount = data.cnaes.filter((item) => item.isPrimary).length;
    if (primaryCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione exatamente um CNAE principal",
        path: ["cnaes"],
      });
    }

    refineIssuerFiscalFields(data, ctx);
  })
  .transform((data) => ({
    ...transformIssuerBase(data),
    cnaes: data.cnaes,
  }));

export type IssuerInput = z.infer<typeof issuerSchema>;
export type IssuerUpdateInput = z.infer<typeof issuerUpdateSchema>;
export type IssuerCnaeInput = z.infer<typeof issuerCnaeInputSchema>;

const allowedPageSizes = [10, 20, 50] as const;

export const issuerListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .catch(10)
    .transform((value) =>
      allowedPageSizes.includes(value as (typeof allowedPageSizes)[number])
        ? (value as (typeof allowedPageSizes)[number])
        : 10,
    ),
});

export type IssuerListQuery = z.infer<typeof issuerListQuerySchema>;

export function parseIssuerListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): IssuerListQuery {
  const get = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : undefined;
  };

  return issuerListQuerySchema.parse({
    q: get("q"),
    page: get("page"),
    pageSize: get("pageSize"),
  });
}

export const issuerStatusLabels: Record<"active" | "inactive", string> = {
  active: "Ativo",
  inactive: "Inativo",
};

export const issuerEnvironmentLabels: Record<"homologacao" | "producao", string> = {
  homologacao: "Homologação",
  producao: "Produção",
};

export type IssuerFormState = {
  errors?: {
    issuer?: Record<string, string[] | undefined>;
    address?: Record<string, string[] | undefined>;
    form?: string[];
  };
  message?: string;
  success?: boolean;
  issuerId?: string;
};
