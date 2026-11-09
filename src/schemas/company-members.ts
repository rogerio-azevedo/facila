import { z } from "zod";

export const companyMemberRoleSchema = z.enum(["admin", "member"]);

export const companyMemberSchema = z.object({
  companyId: z.uuid(),
  userId: z.string().min(1),
  role: companyMemberRoleSchema.default("member"),
});

export type CompanyMemberInput = z.infer<typeof companyMemberSchema>;

export const updateCompanyMemberRoleSchema = z.object({
  memberId: z.uuid(),
  role: companyMemberRoleSchema,
});

export const removeCompanyMemberSchema = z.object({
  memberId: z.uuid(),
});

export type UpdateCompanyMemberRoleInput = z.infer<typeof updateCompanyMemberRoleSchema>;
export type RemoveCompanyMemberInput = z.infer<typeof removeCompanyMemberSchema>;
