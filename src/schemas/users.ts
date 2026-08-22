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
