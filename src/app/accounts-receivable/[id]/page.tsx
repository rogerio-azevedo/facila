import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountReceivableActions } from "@/components/accounts-receivable/account-receivable-actions";
import { AccountReceivableForm } from "@/components/accounts-receivable/account-receivable-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatCompetenceMonth } from "@/lib/billing";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format-currency";
import {
  accountReceivableStatusLabels,
  paymentMethodLabels,
} from "@/schemas/accounts-receivable";
import { getAccountReceivableById } from "@/server/dal/accounts-receivable";
import { listClientOptions } from "@/server/dal/clients";
import { getContractById, listContractOptions } from "@/server/dal/contracts";

type AccountReceivableDetailPageProps = {
  params: Promise<{ id: string }>;
};

function getReceivableTitle(
  contractName: string | null | undefined,
  contractId: string | null,
) {
  if (contractName) {
    return contractName;
  }

  if (contractId) {
    return "Contrato removido";
  }

  return "Conta avulsa";
}

export default async function AccountReceivableDetailPage({
  params,
}: AccountReceivableDetailPageProps) {
  const { id } = await params;
  const receivable = await getAccountReceivableById(id);

  if (!receivable) {
    notFound();
  }

  const [clients, contracts, linkedContract] = await Promise.all([
    listClientOptions(),
    listContractOptions(),
    receivable.contractId ? getContractById(receivable.contractId) : Promise.resolve(null),
  ]);

  const isEditable = receivable.status === "pending";

  return (
    <div className="space-y-4">
      <PageHeader
        title={getReceivableTitle(linkedContract?.name, receivable.contractId)}
        description={`Competência ${formatCompetenceMonth(receivable.competenceDate)} · ${formatCurrency(receivable.amount)} · ${accountReceivableStatusLabels[receivable.status]}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/accounts-receivable">Voltar</Link>
          </Button>
        }
      />

      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <p>Emissão: {formatDate(receivable.issueDate)}</p>
        <p>Vencimento: {formatDate(receivable.dueDate)}</p>
        {receivable.paymentMethod ? (
          <p>
            Pagamento: {paymentMethodLabels[receivable.paymentMethod]} em{" "}
            {formatDate(receivable.paymentDate)}
          </p>
        ) : null}
      </div>

      <AccountReceivableForm
        mode="edit"
        accountReceivableId={receivable.id}
        clients={clients}
        contracts={contracts}
        readOnly={!isEditable}
        initial={{
          clientId: receivable.clientId,
          contractId: receivable.contractId ?? "",
          description: receivable.description,
          amount: receivable.amount,
          competenceMonth: formatCompetenceMonth(receivable.competenceDate),
          issueDate: toDateInputValue(receivable.issueDate),
          dueDate: toDateInputValue(receivable.dueDate),
          notes: receivable.notes ?? "",
        }}
      />

      <AccountReceivableActions
        accountReceivableId={receivable.id}
        status={receivable.status}
      />
    </div>
  );
}
