import { requireClientContext } from "@/server/dal/context";
import { getClientById } from "@/server/dal/clients";

export default async function DashboardPage() {
  const ctx = await requireClientContext();
  const client = await getClientById(ctx.clientId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao ERP Facila{client ? ` — ${client.name}` : ""}.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4 text-sm">
        <p>
          <span className="font-medium">Papel:</span> {ctx.role}
        </p>
        {ctx.isActingAs && (
          <p className="mt-2 text-muted-foreground">
            Você está no modo suporte (super admin agindo como cliente).
          </p>
        )}
      </div>
    </div>
  );
}
