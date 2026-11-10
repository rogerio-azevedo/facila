"use client";

import { useEffect, useState } from "react";
import { KeyRoundIcon, UserPenIcon } from "lucide-react";

import { updateUserAction } from "@/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EditUserDialogProps = {
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditUserDialogProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && open) {
      setName(user.name || "");
      setPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [user, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);

    if (password && password.length < 6) {
      setError("A nova senha deve ter ao menos 6 caracteres.");
      return;
    }

    if (password && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setPending(true);
    try {
      const result = await updateUserAction({
        userId: user.id,
        name: name.trim() || undefined,
        password: password || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      setError("Erro ao atualizar o usuário. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPenIcon className="h-5 w-5 text-primary" />
            Editar usuário
          </DialogTitle>
          <DialogDescription>
            Atualize o nome ou defina uma nova senha de acesso para este usuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="editEmail">E-mail de login</Label>
            <Input
              id="editEmail"
              value={user.email}
              disabled
              className="bg-muted text-muted-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editName">Nome</Label>
            <Input
              id="editName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              required
            />
          </div>

          <div className="border-t pt-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <KeyRoundIcon className="h-3.5 w-3.5" />
              Redefinir senha (opcional)
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editPassword">Nova senha</Label>
              <Input
                id="editPassword"
                type="password"
                placeholder="Deixe em branco para não alterar"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {password && (
              <div className="space-y-1.5">
                <Label htmlFor="editConfirmPassword">Confirmar nova senha</Label>
                <Input
                  id="editConfirmPassword"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
