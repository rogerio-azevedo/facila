import Link from "next/link";

import { ClientsFilters } from "@/components/clients/clients-filters";
import { ClientsPagination } from "@/components/clients/clients-pagination";
import { ClientsTable } from "@/components/clients/clients-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { parseClientListQuery } from "@/schemas/clients";
import { listPrimaryAddressesByClientIds } from "@/server/dal/addresses";
import { listClients } from "@/server/dal/clients";

type ClientsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const query = parseClientListQuery(params);
  const { items, total } = await listClients(query);
  const addresses = await listPrimaryAddressesByClientIds(items.map((item) => item.id));

  const addressByClientId = new Map(
    addresses.map((address) => [address.clientId, address] as const),
  );

  const rows = items.map((item) => {
    const address = addressByClientId.get(item.id);

    return {
      ...item,
      city: address?.city ?? null,
      state: address?.state ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Cadastro fiscal completo para emissão de notas."
        actions={
          <Button asChild>
            <Link href="/clients/new">Novo cliente</Link>
          </Button>
        }
      />

      <ClientsFilters key={`${query.q}-${query.personType}`} query={query} />
      <ClientsTable rows={rows} />
      <ClientsPagination query={query} total={total} />
    </div>
  );
}
