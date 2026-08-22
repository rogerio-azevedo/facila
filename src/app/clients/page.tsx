import Link from "next/link";

import { ClientsList } from "@/components/clients/clients-list";
import { Button } from "@/components/ui/button";
import { listClients } from "@/server/dal/clients";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-muted-foreground">
            Cadastro fiscal completo para emissão de notas.
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">Novo cliente</Link>
        </Button>
      </div>
      <ClientsList clients={clients} />
    </div>
  );
}
