"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, LinkIcon, UserPlusIcon } from "lucide-react";

import { createCompanyInvitationAction } from "@/actions/company-invitations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InviteModalProps = {
  companyId?: string;
  companyName?: string;
  triggerText?: string;
  triggerVariant?: "default" | "outline" | "secondary";
  triggerSize?: "default" | "sm" | "lg";
};

export function InviteModal({
  companyId,
  companyName,
  triggerText = "Convidar usuário",
  triggerVariant = "default",
  triggerSize = "default",
}: InviteModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function resetForm() {
    setEmail("");
    setRole("member");
    setError(null);
    setGeneratedUrl(null);
    setCopied(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await createCompanyInvitationAction({
        email,
        role,
        companyId,
      });

      if (result.error) {
        setError(result.error);
        setPending(false);
        return;
      }

      if (result.inviteUrl) {
        const fullUrl = `${window.location.origin}${result.inviteUrl}`;
        setGeneratedUrl(fullUrl);
      }
    } catch {
      setError("Erro ao gerar link de convite. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className="gap-2">
          <UserPlusIcon className="h-4 w-4" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar para a empresa</DialogTitle>
          <DialogDescription>
            {companyName
              ? `Gere um link de primeiro acesso ou convite para a empresa ${companyName}.`
              : "Envie um link para o usuário definir sua senha ou ingressar na equipe."}
          </DialogDescription>
        </DialogHeader>

        {!generatedUrl ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">E-mail do usuário</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="usuario@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteRole">Nível de acesso (Papel)</Label>
              <Select
                value={role}
                onValueChange={(val) => setRole(val as "admin" | "member")}
              >
                <SelectTrigger id="inviteRole" className="w-full">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro (Acesso operacional padrão)</SelectItem>
                  <SelectItem value="admin">Administrador (Gestão total da empresa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Gerando link..." : "Gerar link de convite"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium text-foreground">Link de acesso pronto!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O convite foi gerado para <strong>{email}</strong> ({role === "admin" ? "Admin" : "Membro"}) e é válido por 7 dias.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={generatedUrl}
                readOnly
                className="font-mono text-xs select-all bg-background"
              />
              <Button
                type="button"
                variant={copied ? "default" : "secondary"}
                className="shrink-0 gap-1.5"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4 text-primary-foreground" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Você pode colar e enviar este link pelo WhatsApp, e-mail ou Slack para o cliente. Ao acessar, ele definirá a senha e entrará diretamente no sistema.
            </p>

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => setOpen(false)}>
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

