"use client";

import { useActionState } from "react";

import { actAsClientFormAction, createClientFormAction } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
};

type PlatformClientsPanelProps = {
  clients: ClientRow[];
};

export function PlatformClientsPanel({ clients }: PlatformClientsPanelProps) {
  const [state, createAction, pending] = useActionState(createClientFormAction, {
    success: false,
  });

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Empresa</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin</Label>
              <Input id="adminName" name="adminName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">E-mail do admin</Label>
              <Input id="adminEmail" name="adminEmail" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Senha do admin</Label>
              <Input id="adminPassword" name="adminPassword" type="password" required />
            </div>
            <div className="md:col-span-2 space-y-2">
              {state.error && <p className="text-sm text-destructive">{state.error}</p>}
              {state.success && (
                <p className="text-sm text-muted-foreground">Cliente criado com sucesso.</p>
              )}
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando..." : "Criar cliente"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clientes ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {clients.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
          )}
          {clients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{client.name}</p>
                <p className="text-sm text-muted-foreground">{client.slug}</p>
              </div>
              <form action={actAsClientFormAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <Button variant="outline" size="sm" type="submit">
                  Agir como
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
