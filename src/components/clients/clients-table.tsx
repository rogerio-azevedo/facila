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
import { formatDocument, formatPhone } from "@/lib/format-document";

export type ClientTableRow = {
  id: string;
  name: string;
  document: string;
  personType: "individual" | "organization";
  phone: string | null;
  city: string | null;
  state: string | null;
};

type ClientsTableProps = {
  rows: ClientTableRow[];
};

export function ClientsTable({ rows }: ClientsTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Nome
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Documento
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Telefone
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Cidade/UF
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Tipo
            </TableHead>
            <TableHead className="h-9 py-2 text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Nenhum cliente encontrado
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="py-2 font-medium">{row.name}</TableCell>
                <TableCell className="py-2">
                  {formatDocument(row.document, row.personType)}
                </TableCell>
                <TableCell className="py-2">
                  {row.phone ? formatPhone(row.phone) : "-"}
                </TableCell>
                <TableCell className="py-2">
                  {row.city && row.state ? `${row.city}/${row.state}` : "-"}
                </TableCell>
                <TableCell className="py-2">
                  {row.personType === "individual" ? "PF" : "PJ"}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button asChild size="sm">
                    <Link href={`/clients/${row.id}`}>Abrir</Link>
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
