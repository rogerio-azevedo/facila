import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(2, { error: "Nome deve ter ao menos 2 caracteres" }).trim(),
  email: z.email({ error: "E-mail inválido" }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Senha deve ter ao menos 8 caracteres" })
    .regex(/[a-zA-Z]/, { error: "Senha deve conter letras" })
    .regex(/[0-9]/, { error: "Senha deve conter números" }),
});

export type UserInput = z.infer<typeof userSchema>;

export const updateUserSchema = z.object({
  userId: z.string().min(1, { error: "ID de usuário inválido" }),
  name: z.string().min(2, { error: "Nome deve ter ao menos 2 caracteres" }).trim().optional(),
  password: z
    .string()
    .min(6, { error: "A nova senha deve ter ao menos 6 caracteres" })
    .optional()
    .or(z.literal("")),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
