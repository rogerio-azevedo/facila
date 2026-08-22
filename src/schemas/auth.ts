import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "E-mail inválido" }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Senha obrigatória" }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type AuthFormState = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
    companyName?: string[];
    form?: string[];
  };
  message?: string;
  success?: boolean;
};
