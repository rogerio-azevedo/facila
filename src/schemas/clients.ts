import { z } from "zod";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(cpf[10]);
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(cnpj[i]) * weights1[i]!;
  let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (check !== Number(cnpj[12])) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(cnpj[i]) * weights2[i]!;
  check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return check === Number(cnpj[13]);
}

export const personTypeSchema = z.enum(["individual", "organization"]);
export const icmsTaxpayerIndicatorSchema = z.enum(["taxpayer", "exempt", "non_taxpayer"]);

export const clientSchema = z
  .object({
    name: z.string().min(1, { error: "Nome obrigatório" }).max(200).trim(),
    personType: personTypeSchema,
    document: z
      .string()
      .min(1, { error: "Documento obrigatório" })
      .transform(digitsOnly),
    legalName: z.string().min(1, { error: "Razão social / nome completo obrigatório" }).max(200).trim(),
    tradeName: z.string().max(200).trim().optional().or(z.literal("")),
    stateRegistration: z.string().max(20).trim().optional().or(z.literal("")),
    icmsTaxpayerIndicator: icmsTaxpayerIndicatorSchema.default("non_taxpayer"),
    municipalRegistration: z.string().max(20).trim().optional().or(z.literal("")),
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
  })
  .superRefine((data, ctx) => {
    if (data.personType === "individual") {
      if (data.document.length !== 11 || !isValidCpf(data.document)) {
        ctx.addIssue({
          code: "custom",
          message: "CPF inválido",
          path: ["document"],
        });
      }
    } else if (data.document.length !== 14 || !isValidCnpj(data.document)) {
      ctx.addIssue({
        code: "custom",
        message: "CNPJ inválido",
        path: ["document"],
      });
    }
  })
  .transform((data) => ({
    ...data,
    tradeName: data.tradeName || undefined,
    stateRegistration: data.stateRegistration || undefined,
    municipalRegistration: data.municipalRegistration || undefined,
  }));

export type ClientInput = z.infer<typeof clientSchema>;

const allowedPageSizes = [10, 20, 50] as const;

export const clientListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ""),
  personType: z.enum(["individual", "organization"]).optional(),
  onlyWithActiveContract: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
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

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;

export function parseClientListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): ClientListQuery {
  const get = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : undefined;
  };

  return clientListQuerySchema.parse({
    q: get("q"),
    personType: get("personType"),
    onlyWithActiveContract: get("onlyWithActiveContract"),
    page: get("page"),
    pageSize: get("pageSize"),
  });
}

export type ClientFormState = {
  errors?: {
    client?: Record<string, string[] | undefined>;
    address?: Record<string, string[] | undefined>;
    form?: string[];
  };
  message?: string;
  success?: boolean;
};
