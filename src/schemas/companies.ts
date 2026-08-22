import { z } from "zod";

export const companyNameSchema = z.object({
  name: z
    .string()
    .min(2, { error: "Nome da empresa deve ter ao menos 2 caracteres" })
    .trim(),
});

export const createCompanySchema = companyNameSchema;

export const actAsCompanySchema = z.object({
  companyId: z.uuid(),
});

export type CompanyNameInput = z.infer<typeof companyNameSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type ActAsCompanyInput = z.infer<typeof actAsCompanySchema>;
