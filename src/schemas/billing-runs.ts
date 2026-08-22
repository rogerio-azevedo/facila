import { z } from "zod";

export const billingRunStatusSchema = z.enum(["completed", "partial_failed"]);

export const billingRunItemStatusSchema = z.enum(["generated", "skipped", "error"]);

export const billingRunSchema = z.object({
  companyId: z.uuid(),
  competenceDate: z.date(),
  status: billingRunStatusSchema,
  createdByUserId: z.string().min(1),
  eligibleCount: z.number().int().min(0),
  generatedCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
  errorCount: z.number().int().min(0),
  totalAmount: z.string(),
  completedAt: z.date().optional(),
});

export type BillingRunInput = z.infer<typeof billingRunSchema>;

export const generateBatchBillingSchema = z.object({
  competenceMonth: z.string().regex(/^\d{4}-\d{2}$/, {
    error: "Competência inválida",
  }),
  contractIds: z.array(z.uuid()).optional(),
});

export type GenerateBatchBillingInput = z.infer<typeof generateBatchBillingSchema>;

export type BillingRunFormState = {
  errors?: Record<string, string[] | undefined> & { form?: string[] };
  message?: string;
  success?: boolean;
  billingRunId?: string;
  generatedCount?: number;
  skippedCount?: number;
  errorCount?: number;
};

export const billingRunStatusLabels: Record<
  z.infer<typeof billingRunStatusSchema>,
  string
> = {
  completed: "Concluído",
  partial_failed: "Parcial com erros",
};

export const billingRunItemStatusLabels: Record<
  z.infer<typeof billingRunItemStatusSchema>,
  string
> = {
  generated: "Gerado",
  skipped: "Ignorado",
  error: "Erro",
};

export type BatchBillingPreviewStatus = "ready" | "already_exists" | "out_of_term";

export const batchBillingPreviewStatusLabels: Record<BatchBillingPreviewStatus, string> = {
  ready: "Pronto",
  already_exists: "Já gerado",
  out_of_term: "Fora da vigência",
};
