import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompetenceMonth, isOverdue } from "@/lib/billing";
import { formatCurrency, formatDate } from "@/lib/format-currency";
import { accountReceivableNfseStatusLabels } from "@/schemas/service-invoices";
import {
  accountReceivableStatusLabels,
  paymentMethodLabels,
} from "@/schemas/accounts-receivable";

export type AccountReceivableTableRow = {
  id: string;
  clientId: string;
  clientName?: string;
  contractId: string | null;
  contractName?: string | null;
  amount: string;
  competenceDate: Date;
  dueDate: Date;
  status: "pending" | "paid" | "canceled";
  paymentDate: Date | null;
  paymentMethod:
    | "pix"
    | "boleto"
    | "transfer"
    | "cash"
    | "credit_card"
    | "debit_card"
    | "other"
    | null;
  nfseStatus: "none" | "pending" | "authorized" | "rejected" | "error" | "canceled";
};

type AccountsReceivableTableProps = {
  rows: AccountReceivableTableRow[];
  showClient?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string, checked: boolean) => void;
  onToggleSelectAll?: (checked: boolean) => void;
  allSelected?: boolean;
  someSelected?: boolean;
};

function getDisplayStatus(row: AccountReceivableTableRow) {
  if (isOverdue(row.status, row.dueDate)) {
    return "Vencido";
  }

  return accountReceivableStatusLabels[row.status];
}

function getContractLabel(row: AccountReceivableTableRow) {
  if (row.contractName) {
    return row.contractName;
  }

  if (row.contractId) {
    return "Contrato removido";
  }

  return "Avulso";
}

export function AccountsReceivableTable({
  rows,
  showClient = false,
  selectable = false,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
  allSelected = false,
  someSelected = false,
}: AccountsReceivableTableProps) {
  const colSpan = 8 + (showClient ? 1 : 0) + (selectable ? 1 : 0);

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable ? (
              <TableHead className="h-9 w-10 py-2">
                {rows.length > 0 ? (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(element) => {
                      if (element) {
                        element.indeterminate = someSelected && !allSelected;
                      }
                    }}
                    onChange={(event) => onToggleSelectAll?.(event.target.checked)}
                    aria-label="Selecionar todas as contas"
                  />
                ) : null}
              </TableHead>
            ) : null}
            {showClient ? (
              <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Cliente
              </TableHead>
            ) : null}
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Contrato
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Competência
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Vencimento
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Valor
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Status
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              NFS-e
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Pagamento
            </TableHead>
            <TableHead className="h-9 py-2 text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                Nenhuma conta a receber encontrada
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {selectable ? (
                  <TableCell className="py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(row.id) ?? false}
                      onChange={(event) => onToggleSelection?.(row.id, event.target.checked)}
                      aria-label={`Selecionar ${getContractLabel(row)}`}
                    />
                  </TableCell>
                ) : null}
                {showClient ? (
                  <TableCell className="py-2">{row.clientName ?? "-"}</TableCell>
                ) : null}
                <TableCell className="py-2 font-medium">{getContractLabel(row)}</TableCell>
                <TableCell className="py-2">
                  {formatCompetenceMonth(row.competenceDate)}
                </TableCell>
                <TableCell className="py-2">{formatDate(row.dueDate)}</TableCell>
                <TableCell className="py-2">{formatCurrency(row.amount)}</TableCell>
                <TableCell className="py-2">{getDisplayStatus(row)}</TableCell>
                <TableCell className="py-2">
                  {accountReceivableNfseStatusLabels[row.nfseStatus]}
                </TableCell>
                <TableCell className="py-2">
                  {row.paymentMethod
                    ? `${paymentMethodLabels[row.paymentMethod]} (${formatDate(row.paymentDate)})`
                    : "-"}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button asChild size="sm">
                    <Link href={`/accounts-receivable/${row.id}`}>Abrir</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
