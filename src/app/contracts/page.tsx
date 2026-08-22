import Link from "next/link";

import { ContractsFilters } from "@/components/contracts/contracts-filters";
import { ContractsPagination } from "@/components/contracts/contracts-pagination";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { parseContractListQuery } from "@/schemas/contracts";
import { listClientsByIds } from "@/server/dal/clients";
import { listContracts } from "@/server/dal/contracts";

type ContractsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContractsPage({ searchParams }: ContractsPageProps) {
  const params = await searchParams;
  const query = parseContractListQuery(params);
  const { items, total } = await listContracts(query);
  const clientSummaries = await listClientsByIds([...new Set(items.map((item) => item.clientId))]);
  const clientNameById = new Map(clientSummaries.map((client) => [client.id, client.name] as const));

  const rows = items.map((item) => ({
    ...item,
    clientName: clientNameById.get(item.clientId),
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contratos"
        description="Gerencie os dados contratuais dos seus clientes para faturamento."
        actions={
          <Button asChild>
            <Link href="/contracts/new">Novo contrato</Link>
          </Button>
        }
      />

      <ContractsFilters key={`${query.q}-${query.status}`} query={query} />
      <ContractsTable rows={rows} showClient />
      <ContractsPagination query={query} total={total} />
    </div>
  );
}
