"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { cancelServiceInvoiceAction } from "@/actions/service-invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCompetenceMonth } from "@/lib/billing";
import { formatCurrency, formatDate } from "@/lib/format-currency";
import { formatServiceInvoiceNumber } from "@/lib/parse-nfse-access-key";
import {
  serviceInvoiceEnvironmentLabels,
  serviceInvoiceStatusLabels,
} from "@/schemas/service-invoices";

type ServiceInvoiceDetailSectionProps = {
  invoice: {
    id: string;
    dpsSeries: string;
    dpsNumber: number;
    environment: "homologacao" | "producao";
    status: "pending" | "authorized" | "rejected" | "canceled" | "error" | "pending_retry";
    accessKey: string | null;
    rejectionReason: string | null;
    cancelReason: string | null;
    authorizedAt: Date | null;
    canceledAt: Date | null;
    createdAt: Date;
    dpsXmlKey: string | null;
    nfseXmlKey: string | null;
    danfseKey: string | null;
  };
  accountReceivable: {
    id: string;
    description: string;
    amount: string;
    competenceDate: Date;
  };
  clientName: string;
  issuerName: string;
};

export function ServiceInvoiceDetailSection({
  invoice,
  accountReceivable,
  clientName,
  issuerName,
}: ServiceInvoiceDetailSectionProps) {
  const [cancelReason, setCancelReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    startTransition(async () => {
      setMessage(null);
      const result = await cancelServiceInvoiceAction({
        serviceInvoiceId: invoice.id,
        reason: cancelReason,
      });

      if ("errors" in result && result.errors) {
        setMessage(Object.values(result.errors).flat().join(", "));
        return;
      }

      setMessage("NFS-e cancelada.");
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <h3 className="text-base font-semibold">
          NFS-e {formatServiceInvoiceNumber(invoice)}
        </h3>
        <p className="text-sm text-muted-foreground">
          {serviceInvoiceStatusLabels[invoice.status]} ·{" "}
          {serviceInvoiceEnvironmentLabels[invoice.environment]}
        </p>
      </div>

      <div className="grid gap-2 text-sm md:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Cliente:</span> {clientName}
        </p>
        <p>
          <span className="text-muted-foreground">Emissor:</span> {issuerName}
        </p>
        <p>
          <span className="text-muted-foreground">Competência:</span>{" "}
          {formatCompetenceMonth(accountReceivable.competenceDate)}
        </p>
        <p>
          <span className="text-muted-foreground">Valor:</span>{" "}
          {formatCurrency(accountReceivable.amount)}
        </p>
        <p>
          <span className="text-muted-foreground">Descrição:</span>{" "}
          {accountReceivable.description}
        </p>
        <p>
          <span className="text-muted-foreground">Criada em:</span>{" "}
          {formatDate(invoice.createdAt)}
        </p>
        {invoice.authorizedAt ? (
          <p>
            <span className="text-muted-foreground">Autorizada em:</span>{" "}
            {formatDate(invoice.authorizedAt)}
          </p>
        ) : null}
        {invoice.canceledAt ? (
          <p>
            <span className="text-muted-foreground">Cancelada em:</span>{" "}
            {formatDate(invoice.canceledAt)}
          </p>
        ) : null}
      </div>

      {invoice.accessKey ? (
        <p className="break-all text-sm">
          <span className="text-muted-foreground">Chave de acesso:</span> {invoice.accessKey}
        </p>
      ) : null}

      {invoice.rejectionReason ? (
        <p className="text-sm text-destructive">{invoice.rejectionReason}</p>
      ) : null}

      {invoice.cancelReason ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Motivo do cancelamento:</span> {invoice.cancelReason}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {invoice.nfseXmlKey ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/api/service-invoices/${invoice.id}/file?kind=nfse`}>XML NFS-e</Link>
          </Button>
        ) : null}
        {invoice.danfseKey ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/api/service-invoices/${invoice.id}/file?kind=danfse`}>DANFSe</Link>
          </Button>
        ) : null}
        {invoice.dpsXmlKey ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/api/service-invoices/${invoice.id}/file?kind=dps`}>XML DPS</Link>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline">
          <Link href={`/accounts-receivable/${accountReceivable.id}`}>Ver conta a receber</Link>
        </Button>
      </div>

      {invoice.status === "authorized" ? (
        <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo do cancelamento</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Descreva o motivo (mín. 15 caracteres)"
            />
          </div>
          <Button type="button" variant="destructive" disabled={pending} onClick={handleCancel}>
            Cancelar NFS-e
          </Button>
        </div>
      ) : null}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
