import { z } from "zod";

export const contractStatusSchema = z.enum(["active", "inactive", "suspended"]);
export const readjustmentIndexSchema = z.enum(["IPCA", "IGPM", "INPC"]);

export const contractSchema = z
  .object({
    clientId: z.uuid({ error: "Cliente obrigatório" }),
    name: z.string().min(1, { error: "Nome obrigatório" }).max(200).trim(),
    description: z
      .string()
      .max(2000)
      .trim()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" ? undefined : v)),
    amount: z.coerce
      .number({ error: "Valor mensal obrigatório" })
      .positive({ error: "Valor mensal deve ser maior que zero" }),
    startDate: z.coerce.date({ error: "Data de início obrigatória" }),
    endDate: z
      .union([z.coerce.date(), z.literal("")])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    termMonths: z.coerce
      .number()
      .int()
      .min(1)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    dueDay: z.coerce
      .number()
      .int()
      .min(1, { error: "Dia de vencimento entre 1 e 31" })
      .max(31, { error: "Dia de vencimento entre 1 e 31" })
      .default(10),
    readjustmentIndex: readjustmentIndexSchema.optional().or(z.literal("")),
    readjustmentMonth: z.coerce
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    status: contractStatusSchema.default("active"),
  })
  .superRefine((data, ctx) => {
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "Data de fim deve ser igual ou posterior à data de início",
        path: ["endDate"],
      });
    }
  })
  .transform((data) => ({
    ...data,
    readjustmentIndex:
      data.readjustmentIndex === "" || !data.readjustmentIndex
        ? undefined
        : data.readjustmentIndex,
  }));

export type ContractInput = z.infer<typeof contractSchema>;

const allowedPageSizes = [10, 20, 50] as const;

export const contractListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ""),
  status: contractStatusSchema.optional(),
  clientId: z.uuid().optional(),
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

export type ContractListQuery = z.infer<typeof contractListQuerySchema>;

export function parseContractListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): ContractListQuery {
  const get = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : undefined;
  };

  return contractListQuerySchema.parse({
    q: get("q"),
    status: get("status"),
    clientId: get("clientId"),
    page: get("page"),
    pageSize: get("pageSize"),
  });
}

export type ContractFormState = {
  errors?: Record<string, string[] | undefined> & { form?: string[] };
  message?: string;
  success?: boolean;
  contractId?: string;
  uploadError?: string;
};

export const READJUSTMENT_OPTIONS = [
  { label: "Nenhum", value: "" },
  { label: "IPCA", value: "IPCA" },
  { label: "IGPM", value: "IGPM" },
  { label: "INPC", value: "INPC" },
] as const;

export const READJUSTMENT_MONTH_OPTIONS = [
  { label: "Nenhum", value: "" },
  { label: "Janeiro", value: "1" },
  { label: "Fevereiro", value: "2" },
  { label: "Março", value: "3" },
  { label: "Abril", value: "4" },
  { label: "Maio", value: "5" },
  { label: "Junho", value: "6" },
  { label: "Julho", value: "7" },
  { label: "Agosto", value: "8" },
  { label: "Setembro", value: "9" },
  { label: "Outubro", value: "10" },
  { label: "Novembro", value: "11" },
  { label: "Dezembro", value: "12" },
] as const;

export const CONTRACT_STATUS_OPTIONS = [
  { label: "Ativo", value: "active" },
  { label: "Inativo", value: "inactive" },
  { label: "Suspenso", value: "suspended" },
] as const;
