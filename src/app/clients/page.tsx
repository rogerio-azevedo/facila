import Link from "next/link";

import { ClientsFilters } from "@/components/clients/clients-filters";
import { ClientsPagination } from "@/components/clients/clients-pagination";
import { ClientsTable } from "@/components/clients/clients-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { parseClientListQuery } from "@/schemas/clients";
import { listPrimaryAddressesByClientIds } from "@/server/dal/addresses";
import { listClients } from "@/server/dal/clients";
import { listActiveContractStatsByClientIds } from "@/server/dal/contracts";

type ClientsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const query = parseClientListQuery(params);
  const { items, total } = await listClients(query);
  const clientIds = items.map((item) => item.id);
  const [addresses, contractStats] = await Promise.all([
    listPrimaryAddressesByClientIds(clientIds),
    listActiveContractStatsByClientIds(clientIds),
  ]);

  const addressByClientId = new Map(
    addresses.map((address) => [address.clientId, address] as const),
  );
  const statsByClientId = new Map(
    contractStats.map((stat) => [stat.clientId, stat] as const),
  );

  const rows = items.map((item) => {
    const address = addressByClientId.get(item.id);
    const stats = statsByClientId.get(item.id);

    return {
      ...item,
      city: address?.city ?? null,
      state: address?.state ?? null,
      activeContracts: stats?.activeCount ?? 0,
      monthlyAmount: stats?.monthlyAmount ?? "0",
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Gerencie os dados contratuais dos seus clientes para faturamento."
        actions={
          <Button asChild>
            <Link href="/clients/new">Novo cliente</Link>
          </Button>
        }
      />

      <ClientsFilters
        key={`${query.q}-${query.personType}-${query.onlyWithActiveContract}`}
        query={query}
      />
      <ClientsTable rows={rows} />
      <ClientsPagination query={query} total={total} />
    </div>
  );
}
