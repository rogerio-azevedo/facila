import Link from "next/link";
import { notFound } from "next/navigation";

import { BillingRunNfsePanel } from "@/components/billing/billing-run-nfse-panel";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatCompetenceMonth } from "@/lib/billing";
import { formatCurrency, formatDate } from "@/lib/format-currency";
import { billingRunStatusLabels } from "@/schemas/billing-runs";
import { listAccountsReceivableByIds } from "@/server/dal/accounts-receivable";
import { listBillingRunItemsByRunId } from "@/server/dal/billing-run-items";
import { getBillingRunById } from "@/server/dal/billing-runs";
import { listClientsByIds } from "@/server/dal/clients";
import { listContractSummariesByIds } from "@/server/dal/contracts";

type BillingRunDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BillingRunDetailPage({ params }: BillingRunDetailPageProps) {
  const { id } = await params;
  const billingRun = await getBillingRunById(id);

  if (!billingRun) {
    notFound();
  }

  const runItems = await listBillingRunItemsByRunId(id);

  const accountReceivableIds = runItems
    .map((item) => item.accountReceivableId)
    .filter((itemId): itemId is string => Boolean(itemId));

  const [accountReceivables, contractSummaries] = await Promise.all([
    listAccountsReceivableByIds(accountReceivableIds),
    listContractSummariesByIds([...new Set(runItems.map((item) => item.contractId))]),
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
  const contractNameById = new Map(
    contractSummaries.map((contract) => [contract.id, contract.name] as const),
  );

  const items = runItems.map((item) => {
    const accountReceivable = item.accountReceivableId
      ? accountReceivableById.get(item.accountReceivableId)
      : undefined;

    return {
      id: item.id,
      contractId: item.contractId,
      contractName: contractNameById.get(item.contractId) ?? "Contrato removido",
      clientName: accountReceivable ? (clientNameById.get(accountReceivable.clientId) ?? "-") : "-",
      accountReceivableId: item.accountReceivableId,
      amount: item.amount,
      dueDate: item.dueDate,
      status: item.status,
      nfseStatus: accountReceivable?.nfseStatus ?? null,
      skipReason: item.skipReason,
      errorMessage: item.errorMessage,
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Faturamento ${formatCompetenceMonth(billingRun.competenceDate)}`}
        description={`${billingRunStatusLabels[billingRun.status]} · ${billingRun.generatedCount} gerados · ${formatCurrency(billingRun.totalAmount)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/billing">Voltar</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/accounts-receivable">Contas a receber</Link>
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <p>Executado em: {formatDate(billingRun.completedAt ?? billingRun.createdAt)}</p>
        <p>
          Gerados: {billingRun.generatedCount} · Ignorados: {billingRun.skippedCount} · Erros:{" "}
          {billingRun.errorCount}
        </p>
      </div>

      <BillingRunNfsePanel items={items} />
    </div>
  );
}
