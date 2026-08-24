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
import { formatCompetenceMonth } from "@/lib/billing";
import { formatCurrency, formatDate } from "@/lib/format-currency";
import { formatServiceInvoiceNumber } from "@/lib/parse-nfse-access-key";
import {
  serviceInvoiceEnvironmentLabels,
  serviceInvoiceStatusLabels,
} from "@/schemas/service-invoices";

export type ServiceInvoiceTableRow = {
  id: string;
  dpsSeries: string;
  dpsNumber: number;
  environment: "homologacao" | "producao";
  status: "pending" | "authorized" | "rejected" | "canceled" | "error" | "pending_retry";
  accessKey: string | null;
  authorizedAt: Date | null;
  createdAt: Date;
  clientName?: string;
  amount?: string;
  competenceDate?: Date;
  accountReceivableId: string;
};

type ServiceInvoicesTableProps = {
  rows: ServiceInvoiceTableRow[];
};

export function ServiceInvoicesTable({ rows }: ServiceInvoicesTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Nº NFS-e
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Cliente
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Competência
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Valor
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Ambiente
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Status
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Autorizada em
            </TableHead>
            <TableHead className="h-9 py-2 text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                Nenhuma NFS-e encontrada
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="py-2 font-medium">
                  {formatServiceInvoiceNumber(row)}
                </TableCell>
                <TableCell className="py-2">{row.clientName ?? "-"}</TableCell>
                <TableCell className="py-2">
                  {row.competenceDate ? formatCompetenceMonth(row.competenceDate) : "-"}
                </TableCell>
                <TableCell className="py-2">
                  {row.amount ? formatCurrency(row.amount) : "-"}
                </TableCell>
                <TableCell className="py-2">
                  {serviceInvoiceEnvironmentLabels[row.environment]}
                </TableCell>
                <TableCell className="py-2">{serviceInvoiceStatusLabels[row.status]}</TableCell>
                <TableCell className="py-2">
                  {row.authorizedAt ? formatDate(row.authorizedAt) : "-"}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button asChild size="sm">
                    <Link href={`/service-invoices/${row.id}`}>Abrir</Link>
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
