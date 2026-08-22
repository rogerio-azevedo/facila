import { z } from "zod";

export const companyMemberRoleSchema = z.enum(["admin", "member"]);

export const companyMemberSchema = z.object({
  companyId: z.uuid(),
  userId: z.string().min(1),
  role: companyMemberRoleSchema.default("member"),
});

export type CompanyMemberInput = z.infer<typeof companyMemberSchema>;
