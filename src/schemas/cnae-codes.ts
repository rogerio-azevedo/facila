import { z } from "zod";

import { digitsOnly } from "@/lib/validate-document";

export const ensureCnaeCodeSchema = z.object({
  code: z
    .string()
    .min(1, { error: "CNAE obrigatório" })
    .transform(digitsOnly)
    .refine((value) => value.length === 7, { message: "CNAE deve ter 7 dígitos" }),
  description: z
    .string()
    .min(1, { error: "Descrição obrigatória" })
    .max(500, { error: "Descrição muito longa" })
    .trim(),
});

export type EnsureCnaeCodeInput = z.infer<typeof ensureCnaeCodeSchema>;
