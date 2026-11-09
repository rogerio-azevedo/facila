import { z } from "zod";

import { companyMemberRoleSchema } from "./company-members";

export const createCompanyInvitationSchema = z.object({
  email: z
    .string()
    .email({ message: "E-mail inválido" })
    .trim()
    .toLowerCase(),
  role: companyMemberRoleSchema.default("member"),
  companyId: z.uuid().optional(),
});

export const acceptCompanyInvitationSchema = z.object({
  token: z.string().min(1, { message: "Token inválido" }),
  name: z
    .string()
    .min(2, { message: "O nome deve ter ao menos 2 caracteres" })
    .max(100)
    .trim()
    .optional(),
  password: z
    .string()
    .min(6, { message: "A senha deve ter ao menos 6 caracteres" })
    .optional(),
});

export const revokeCompanyInvitationSchema = z.object({
  invitationId: z.uuid(),
});

export type CreateCompanyInvitationInput = z.infer<typeof createCompanyInvitationSchema>;
export type AcceptCompanyInvitationInput = z.infer<typeof acceptCompanyInvitationSchema>;
export type RevokeCompanyInvitationInput = z.infer<typeof revokeCompanyInvitationSchema>;

