import { z } from "zod";

export const accountReceivableStatusSchema = z.enum(["pending", "paid", "canceled"]);

export const paymentMethodSchema = z.enum([
  "pix",
  "boleto",
  "transfer",
  "cash",
  "credit_card",
  "debit_card",
  "other",
]);

export const accountReceivableSchema = z
  .object({
    clientId: z.uuid({ error: "Cliente obrigatório" }),
    contractId: z
      .union([z.uuid(), z.literal("")])
      .optional()
      .transform((value) => (value === "" || !value ? undefined : value)),
    description: z.string().min(1, { error: "Descrição obrigatória" }).max(500).trim(),
    amount: z.coerce
      .number({ error: "Valor obrigatório" })
      .positive({ error: "Valor deve ser maior que zero" }),
    competenceDate: z.coerce.date({ error: "Competência obrigatória" }),
    issueDate: z.coerce.date({ error: "Data de emissão obrigatória" }),
    dueDate: z.coerce.date({ error: "Data de vencimento obrigatória" }),
    notes: z
      .string()
      .max(2000)
      .trim()
      .optional()
      .or(z.literal(""))
      .transform((value) => (value === "" ? undefined : value)),
  })
  .transform((data) => ({
    ...data,
    competenceDate: new Date(
      Date.UTC(
        data.competenceDate.getUTCFullYear(),
        data.competenceDate.getUTCMonth(),
        1,
      ),
    ),
  }));

export type AccountReceivableInput = z.infer<typeof accountReceivableSchema>;

export const accountReceivableUpdateSchema = z.object({
  description: z.string().min(1).max(500).trim(),
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
  notes: z
    .string()
    .max(2000)
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" ? undefined : value)),
});

export type AccountReceivableUpdateInput = z.infer<typeof accountReceivableUpdateSchema>;

export const markAccountReceivablePaidSchema = z.object({
  paymentDate: z.coerce.date({ error: "Data de pagamento obrigatória" }),
  paymentMethod: paymentMethodSchema,
  notes: z
    .string()
    .max(2000)
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" ? undefined : value)),
});

export type MarkAccountReceivablePaidInput = z.infer<typeof markAccountReceivablePaidSchema>;

const listStatusSchema = z.enum(["pending", "paid", "canceled", "overdue"]);

export const accountReceivableListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ""),
  clientId: z.uuid().optional(),
  status: listStatusSchema.optional(),
  competenceMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .catch(10)
    .transform((value) => ([10, 20, 50].includes(value) ? value : 10)),
});

export type AccountReceivableListQuery = z.infer<typeof accountReceivableListQuerySchema>;

export function parseAccountReceivableListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): AccountReceivableListQuery {
  const get = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : undefined;
  };

  return accountReceivableListQuerySchema.parse({
    q: get("q"),
    clientId: get("clientId"),
    status: get("status"),
    competenceMonth: get("competenceMonth"),
    page: get("page"),
    pageSize: get("pageSize"),
  });
}

export type AccountReceivableFormState = {
  errors?: Record<string, string[] | undefined> & { form?: string[] };
  message?: string;
  success?: boolean;
  accountReceivableId?: string;
};

export const PAYMENT_METHOD_OPTIONS = [
  { label: "PIX", value: "pix" },
  { label: "Boleto", value: "boleto" },
  { label: "Transferência", value: "transfer" },
  { label: "Dinheiro", value: "cash" },
  { label: "Cartão de crédito", value: "credit_card" },
  { label: "Cartão de débito", value: "debit_card" },
  { label: "Outros", value: "other" },
] as const;

export const ACCOUNT_RECEIVABLE_STATUS_OPTIONS = [
  { label: "Pendente", value: "pending" },
  { label: "Pago", value: "paid" },
  { label: "Cancelado", value: "canceled" },
  { label: "Vencido", value: "overdue" },
] as const;

export const paymentMethodLabels: Record<
  z.infer<typeof paymentMethodSchema>,
  string
> = {
  pix: "PIX",
  boleto: "Boleto",
  transfer: "Transferência",
  cash: "Dinheiro",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  other: "Outros",
};

export const accountReceivableStatusLabels: Record<
  z.infer<typeof accountReceivableStatusSchema>,
  string
> = {
  pending: "Pendente",
  paid: "Pago",
  canceled: "Cancelado",
};
