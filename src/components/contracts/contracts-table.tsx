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
import { formatCurrency, formatDateRange } from "@/lib/format-currency";

export type ContractTableRow = {
  id: string;
  clientId: string;
  clientName?: string;
  name: string;
  amount: string;
  status: "active" | "inactive" | "suspended";
  dueDay: number;
  startDate: Date;
  endDate: Date | null;
};

const statusLabels = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
} as const;

type ContractsTableProps = {
  rows: ContractTableRow[];
  showClient?: boolean;
};

export function ContractsTable({ rows, showClient = false }: ContractsTableProps) {
  const colSpan = 6 + (showClient ? 1 : 0);

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Nome
            </TableHead>
            {showClient ? (
              <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Cliente
              </TableHead>
            ) : null}
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Valor
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Vigência
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Vencimento
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Status
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
                Nenhum contrato encontrado
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="py-2 font-medium">{row.name}</TableCell>
                {showClient ? (
                  <TableCell className="py-2">{row.clientName ?? "-"}</TableCell>
                ) : null}
                <TableCell className="py-2">{formatCurrency(row.amount)}</TableCell>
                <TableCell className="py-2">
                  {formatDateRange(row.startDate, row.endDate)}
                </TableCell>
                <TableCell className="py-2">Dia {row.dueDay}</TableCell>
                <TableCell className="py-2">{statusLabels[row.status]}</TableCell>
                <TableCell className="py-2 text-right">
                  <Button asChild size="sm">
                    <Link href={`/contracts/${row.id}`}>Abrir</Link>
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
