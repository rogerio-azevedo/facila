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
import { formatDocument } from "@/lib/format-document";
import { formatDate } from "@/lib/format-currency";
import { issuerEnvironmentLabels, issuerStatusLabels } from "@/schemas/issuers";

export type IssuerTableRow = {
  id: string;
  legalName: string;
  tradeName: string | null;
  cnpj: string;
  municipalityName: string;
  municipalityUf: string;
  environment: "homologacao" | "producao";
  status: "active" | "inactive";
  isDefault: boolean;
  certificateExpiresAt: Date | null;
  certificateUploadedAt: Date | null;
};

type IssuersTableProps = {
  rows: IssuerTableRow[];
};

function getCertificateStatus(row: IssuerTableRow) {
  if (!row.certificateUploadedAt) {
    return "Sem certificado";
  }

  if (!row.certificateExpiresAt) {
    return "Configurado";
  }

  const expires = new Date(row.certificateExpiresAt);
  if (expires.getTime() < Date.now()) {
    return "Expirado";
  }

  if (expires.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30) {
    return `Expira em ${formatDate(expires)}`;
  }

  return `Válido até ${formatDate(expires)}`;
}

export function IssuersTable({ rows }: IssuersTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Emissor
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              CNPJ
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Município
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Ambiente
            </TableHead>
            <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Certificado
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
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Nenhum emissor cadastrado
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="py-2 font-medium">
                  {row.legalName}
                  {row.isDefault ? (
                    <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      Padrão
                    </span>
                  ) : null}
                  {row.tradeName ? (
                    <p className="text-xs text-muted-foreground">{row.tradeName}</p>
                  ) : null}
                </TableCell>
                <TableCell className="py-2">{formatDocument(row.cnpj, "organization")}</TableCell>
                <TableCell className="py-2">
                  {row.municipalityName}/{row.municipalityUf}
                </TableCell>
                <TableCell className="py-2">{issuerEnvironmentLabels[row.environment]}</TableCell>
                <TableCell className="py-2">{getCertificateStatus(row)}</TableCell>
                <TableCell className="py-2">{issuerStatusLabels[row.status]}</TableCell>
                <TableCell className="py-2 text-right">
                  <Button asChild size="sm">
                    <Link href={`/issuers/${row.id}`}>Abrir</Link>
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
