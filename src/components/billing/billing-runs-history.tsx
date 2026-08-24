import Link from "next/link";

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
import { billingRunStatusLabels } from "@/schemas/billing-runs";
import type { BillingRunListItem } from "@/server/dal/billing-runs";

type BillingRunsHistoryProps = {
  runs: BillingRunListItem[];
};

export function BillingRunsHistory({ runs }: BillingRunsHistoryProps) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Competência</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Gerados</TableHead>
            <TableHead>Ignorados</TableHead>
            <TableHead>Erros</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Executado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                Nenhum faturamento em lote executado ainda
              </TableCell>
            </TableRow>
          ) : (
            runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell>
                  <Link href={`/billing/${run.id}`} className="font-medium hover:underline">
                    {formatCompetenceMonth(run.competenceDate)}
                  </Link>
                </TableCell>
                <TableCell>{billingRunStatusLabels[run.status]}</TableCell>
                <TableCell>{run.generatedCount}</TableCell>
                <TableCell>{run.skippedCount}</TableCell>
                <TableCell>{run.errorCount}</TableCell>
                <TableCell>{formatCurrency(run.totalAmount)}</TableCell>
                <TableCell>{formatDate(run.completedAt ?? run.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
