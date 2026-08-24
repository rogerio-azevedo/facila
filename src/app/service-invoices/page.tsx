import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { ServiceInvoicesFilters } from "@/components/service-invoices/service-invoices-filters";
import { ServiceInvoicesPagination } from "@/components/service-invoices/service-invoices-pagination";
import { ServiceInvoicesTable } from "@/components/service-invoices/service-invoices-table";
import { Button } from "@/components/ui/button";
import { parseServiceInvoiceListQuery } from "@/schemas/service-invoices";
import {
  listAccountReceivableIdsByClientIds,
  listAccountsReceivableByIds,
} from "@/server/dal/accounts-receivable";
import { listClients, listClientsByIds } from "@/server/dal/clients";
import { listIssuers } from "@/server/dal/issuers";
import { listServiceInvoices } from "@/server/dal/service-invoices";

type ServiceInvoicesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ServiceInvoicesPage({ searchParams }: ServiceInvoicesPageProps) {
  const params = await searchParams;
  const query = parseServiceInvoiceListQuery(params);

  const accountReceivableIdsPromise = query.q
    ? listClients({ q: query.q, page: 1, pageSize: 50, onlyWithActiveContract: false }).then(
        (result) =>
          listAccountReceivableIdsByClientIds(result.items.map((client) => client.id)),
      )
    : Promise.resolve(undefined);

  const [accountReceivableIds, issuersResult] = await Promise.all([
    accountReceivableIdsPromise,
    listIssuers({ q: "", page: 1, pageSize: 50 }),
  ]);

  const { items, total } = await listServiceInvoices(query, {
    accountReceivableIds,
  });

  const accountReceivables = await listAccountsReceivableByIds([
    ...new Set(items.map((item) => item.accountReceivableId)),
  ]);

  const clientSummaries = await listClientsByIds([
    ...new Set(accountReceivables.map((item) => item.clientId)),
  ]);

  const accountReceivableById = new Map(
    accountReceivables.map((item) => [item.id, item] as const),
  );
  const clientNameById = new Map(
    clientSummaries.map((client) => [client.id, client.name] as const),
  );

  const rows = items.map((item) => {
    const accountReceivable = accountReceivableById.get(item.accountReceivableId);

    return {
      id: item.id,
      dpsSeries: item.dpsSeries,
      dpsNumber: item.dpsNumber,
      environment: item.environment,
      status: item.status,
      accessKey: item.accessKey,
      authorizedAt: item.authorizedAt,
      createdAt: item.createdAt,
      accountReceivableId: item.accountReceivableId,
      clientName: accountReceivable
        ? clientNameById.get(accountReceivable.clientId)
        : undefined,
      amount: accountReceivable?.amount,
      competenceDate: accountReceivable?.competenceDate,
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notas Fiscais"
        description="Consulte NFS-e emitidas, baixe arquivos e acompanhe o status de autorização."
        actions={
          <Button variant="outline" asChild>
            <Link href="/accounts-receivable">Contas a receber</Link>
          </Button>
        }
      />

      <ServiceInvoicesFilters
        key={`${query.q}-${query.status}-${query.environment}-${query.issuerId}`}
        query={query}
        issuers={issuersResult.items.map((issuer) => ({
          id: issuer.id,
          legalName: issuer.legalName,
        }))}
      />
      <ServiceInvoicesTable rows={rows} />
      <ServiceInvoicesPagination query={query} total={total} />
    </div>
  );
}
