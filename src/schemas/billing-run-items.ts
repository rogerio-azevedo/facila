import { z } from "zod";

import { billingRunItemStatusSchema } from "@/schemas/billing-runs";

export const billingRunItemSchema = z.object({
  billingRunId: z.uuid(),
  contractId: z.uuid(),
  status: billingRunItemStatusSchema,
  skipReason: z.string().optional(),
  errorMessage: z.string().optional(),
  accountReceivableId: z.uuid().optional(),
  amount: z.string().optional(),
  dueDate: z.date().optional(),
});

export type BillingRunItemInput = z.infer<typeof billingRunItemSchema>;
