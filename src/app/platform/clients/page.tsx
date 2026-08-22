import { PlatformClientsPanel } from "@/components/platform/clients-panel";
import { listAllClients } from "@/server/dal/clients";
import { requirePlatformContext } from "@/server/dal/context";

export default async function PlatformClientsPage() {
  await requirePlatformContext();
  const clients = await listAllClients();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-muted-foreground">
          Gerencie empresas cadastradas e entre no modo suporte quando necessário.
        </p>
      </div>
      <PlatformClientsPanel clients={clients} />
    </div>
  );
}
