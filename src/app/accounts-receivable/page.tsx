import Link from "next/link";

import { AccountsReceivableFilters } from "@/components/accounts-receivable/accounts-receivable-filters";
import { AccountsReceivableListPanel } from "@/components/accounts-receivable/accounts-receivable-list-panel";
import { AccountsReceivablePagination } from "@/components/accounts-receivable/accounts-receivable-pagination";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatCompetenceMonth } from "@/lib/billing";
import { parseAccountReceivableListQuery } from "@/schemas/accounts-receivable";
import { listAccountsReceivable } from "@/server/dal/accounts-receivable";
import { listClientsByIds } from "@/server/dal/clients";
import {
  listContractIdsByNameSearch,
  listContractSummariesByIds,
} from "@/server/dal/contracts";

type AccountsReceivablePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountsReceivablePage({
  searchParams,
}: AccountsReceivablePageProps) {
  const params = await searchParams;
  const parsedQuery = parseAccountReceivableListQuery(params);
  const query = {
    ...parsedQuery,
    competenceMonth:
      parsedQuery.competenceMonth ?? formatCompetenceMonth(new Date()),
  };

  const contractIds = query.q ? await listContractIdsByNameSearch(query.q) : undefined;
  const { items, total } = await listAccountsReceivable(query, { contractIds });

  const [clientSummaries, contractSummaries] = await Promise.all([
    listClientsByIds([...new Set(items.map((item) => item.clientId))]),
    listContractSummariesByIds([
      ...new Set(items.map((item) => item.contractId).filter(Boolean) as string[]),
    ]),
  ]);

  const clientNameById = new Map(
    clientSummaries.map((client) => [client.id, client.name] as const),
  );
  const contractNameById = new Map(
    contractSummaries.map((contract) => [contract.id, contract.name] as const),
  );

  const rows = items.map((item) => ({
    id: item.id,
    clientId: item.clientId,
    clientName: clientNameById.get(item.clientId),
    contractId: item.contractId,
    contractName: item.contractId ? contractNameById.get(item.contractId) : null,
    amount: item.amount,
    competenceDate: item.competenceDate,
    dueDate: item.dueDate,
    status: item.status,
    paymentDate: item.paymentDate,
    paymentMethod: item.paymentMethod,
    nfseStatus: item.nfseStatus,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contas a receber"
        description="Gerencie títulos de cobrança e baixas manuais."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/billing">Faturamento em lote</Link>
            </Button>
            <Button asChild>
              <Link href="/accounts-receivable/new">Nova conta</Link>
            </Button>
          </div>
        }
      />

      <AccountsReceivableFilters key={`${query.q}-${query.status}-${query.competenceMonth}`} query={query} />
      <AccountsReceivableListPanel rows={rows} />
      <AccountsReceivablePagination query={query} total={total} />
    </div>
  );
}
