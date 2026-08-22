import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "E-mail inválido" }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Senha obrigatória" }),
});

export const registerSchema = z.object({
  name: z.string().min(2, { error: "Nome deve ter ao menos 2 caracteres" }).trim(),
  email: z.email({ error: "E-mail inválido" }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Senha deve ter ao menos 8 caracteres" })
    .regex(/[a-zA-Z]/, { error: "Senha deve conter letras" })
    .regex(/[0-9]/, { error: "Senha deve conter números" }),
  companyName: z
    .string()
    .min(2, { error: "Nome da empresa deve ter ao menos 2 caracteres" })
    .trim(),
});

export const createClientSchema = z.object({
  name: z.string().min(2).trim(),
  adminName: z.string().min(2).trim(),
  adminEmail: z.email().trim().toLowerCase(),
  adminPassword: z.string().min(8),
});

export const actAsClientSchema = z.object({
  clientId: z.uuid(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;

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
