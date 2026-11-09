"use client";

import { useState } from "react";
import Link from "next/link";
import { acceptCompanyInvitationAction } from "@/actions/company-invitations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InviteAcceptanceFormProps = {
  token: string;
  email: string;
  companyName: string;
  role: "admin" | "member";
  isExistingUser: boolean;
};

export function InviteAcceptanceForm({
  token,
  email,
  companyName,
  role,
  isExistingUser,
}: InviteAcceptanceFormProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const roleLabel = role === "admin" ? "Administrador" : "Membro";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isExistingUser) {
      if (!name.trim()) {
        setError("Por favor, digite seu nome.");
        return;
      }
      if (password.length < 6) {
        setError("A senha deve ter ao menos 6 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        return;
      }
    } else {
      if (!password) {
        setError("Por favor, digite sua senha.");
        return;
      }
    }

    setPending(true);
    try {
      const result = await acceptCompanyInvitationAction({
        token,
        name: isExistingUser ? undefined : name.trim(),
        password,
      });

      if (result && "error" in result && result.error) {
        setError(result.error);
        setPending(false);
      }
    } catch {
      setError("Ocorreu um erro ao processar seu acesso. Tente novamente.");
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-2">
          Convite para {roleLabel}
        </div>
        <CardTitle className="text-xl">
          {isExistingUser ? "Acessar empresa" : "Primeiro acesso ao Facila"}
        </CardTitle>
        <CardDescription>
          Você foi convidado para a empresa{" "}
          <strong className="text-foreground font-semibold">{companyName}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} disabled className="bg-muted text-muted-foreground" />
          </div>

          {!isExistingUser && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Seu nome completo</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: João da Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="password">
              {isExistingUser ? "Sua senha atual" : "Crie uma senha"}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={isExistingUser ? "Digite sua senha" : "Mínimo 6 caracteres"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isExistingUser && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirme a senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repita sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? "Processando..."
              : isExistingUser
              ? "Aceitar convite e entrar"
              : "Concluir cadastro e acessar"}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Já tem conta e prefere fazer login normal?{" "}
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Ir para Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

