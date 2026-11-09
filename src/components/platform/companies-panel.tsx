"use client";

import { useActionState, useState } from "react";
import { CheckIcon, CopyIcon, LinkIcon } from "lucide-react";

import { actAsCompanyFormAction, createCompanyFormAction } from "@/actions/companies";
import { CompanyMembersDialog } from "@/components/platform/company-members-dialog";
import { InviteModal } from "@/components/team/invite-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
};

type PlatformCompaniesPanelProps = {
  companies: CompanyRow[];
};

export function PlatformCompaniesPanel({ companies }: PlatformCompaniesPanelProps) {
  const [state, createAction, pending] = useActionState(createCompanyFormAction, {
    success: false,
  });
  const [copiedUrl, setCopiedUrl] = useState(false);

  async function handleCopyInvite(url: string) {
    const full = `${window.location.origin}${url}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Empresa</Label>
              <Input id="name" name="name" placeholder="Ex: Escritório Alpha" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin</Label>
              <Input id="adminName" name="adminName" placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">E-mail do admin</Label>
              <Input
                id="adminEmail"
                name="adminEmail"
                type="email"
                placeholder="cliente@empresa.com.br"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">
                Senha do admin{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (Opcional - deixe vazio para gerar link de 1º acesso)
                </span>
              </Label>
              <Input
                id="adminPassword"
                name="adminPassword"
                type="password"
                placeholder="Defina uma senha ou deixe em branco"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
              {state.success && !state.inviteUrl && (
                <p className="text-sm text-muted-foreground">
                  Empresa e usuário criados com sucesso.
                </p>
              )}
              {state.success && state.inviteUrl && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <LinkIcon className="h-4 w-4" />
                    Empresa criada! Link de Primeiro Acesso gerado:
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}${state.inviteUrl}`}
                      readOnly
                      className="font-mono text-xs select-all bg-background"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant={copiedUrl ? "default" : "secondary"}
                      className="shrink-0 gap-1.5"
                      onClick={() => handleCopyInvite(state.inviteUrl!)}
                    >
                      {copiedUrl ? (
                        <>
                          <CheckIcon className="h-4 w-4 text-primary-foreground" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <CopyIcon className="h-4 w-4" />
                          Copiar link
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envie este link para o cliente. Ao clicar, ele definirá a própria senha e entrará diretamente no sistema.
                  </p>
                </div>
              )}
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando..." : "Criar empresa"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Empresas ({companies.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {companies.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada.</p>
          )}
          {companies.map((company) => (
            <div
              key={company.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{company.name}</p>
                <p className="text-sm text-muted-foreground">{company.slug}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CompanyMembersDialog
                  companyId={company.id}
                  companyName={company.name}
                />
                <InviteModal
                  companyId={company.id}
                  companyName={company.name}
                  triggerText="Convidar"
                  triggerVariant="outline"
                  triggerSize="sm"
                />
                <form action={actAsCompanyFormAction}>
                  <input type="hidden" name="companyId" value={company.id} />
                  <Button variant="outline" size="sm" type="submit">
                    Agir como
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
