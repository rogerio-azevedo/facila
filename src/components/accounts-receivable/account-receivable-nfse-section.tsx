"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  cancelServiceInvoiceAction,
  emitServiceInvoiceAction,
  recoverServiceInvoiceAction,
} from "@/actions/service-invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  accountReceivableNfseStatusLabels,
  serviceInvoiceStatusLabels,
} from "@/schemas/service-invoices";
import { formatServiceInvoiceNumber } from "@/lib/parse-nfse-access-key";
import type { ServiceInvoiceRecord } from "@/server/dal/service-invoices";

type AccountReceivableNfseSectionProps = {
  accountReceivableId: string;
  status: "pending" | "paid" | "canceled";
  nfseStatus: "none" | "pending" | "authorized" | "rejected" | "error" | "canceled";
  invoices: ServiceInvoiceRecord[];
};

export function AccountReceivableNfseSection({
  accountReceivableId,
  status,
  nfseStatus,
  invoices,
}: AccountReceivableNfseSectionProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [pending, startTransition] = useTransition();

  const activeInvoice = invoices.find((invoice) => invoice.status === "authorized") ?? invoices[0];

  function handleEmit() {
    startTransition(async () => {
      setMessage(null);
      const result = await emitServiceInvoiceAction({ accountReceivableId });
      if (result.message) {
        setMessage(result.message);
        return;
      }
      if (result.success) {
        setMessage("NFS-e emitida com sucesso.");
      }
    });
  }

  function handleRecover() {
    startTransition(async () => {
      setMessage(null);
      const result = await recoverServiceInvoiceAction(accountReceivableId);
      setMessage(result.message ?? (result.success ? "Emissão recuperada." : "Falha na recuperação."));
    });
  }

  function handleCancel() {
    if (!activeInvoice) return;

    startTransition(async () => {
      setMessage(null);
      const result = await cancelServiceInvoiceAction({
        serviceInvoiceId: activeInvoice.id,
        reason: cancelReason,
      });
      if ("errors" in result && result.errors) {
        setMessage(Object.values(result.errors).flat().join(", "));
        return;
      }
      setMessage("NFS-e cancelada.");
    });
  }

  const canEmit = status === "pending" && nfseStatus !== "authorized";

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <h3 className="text-base font-semibold">NFS-e Nacional</h3>
        <p className="text-sm text-muted-foreground">
          Status: {accountReceivableNfseStatusLabels[nfseStatus]}
        </p>
      </div>

      {canEmit ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={pending} onClick={handleEmit}>
            {pending ? "Processando..." : "Emitir NFS-e"}
          </Button>
          {nfseStatus === "error" ? (
            <Button type="button" variant="outline" disabled={pending} onClick={handleRecover}>
              Recuperar emissão
            </Button>
          ) : null}
        </div>
      ) : null}

      {activeInvoice ? (
        <div className="space-y-2 text-sm">
          <p>
            Nota #{formatServiceInvoiceNumber(activeInvoice)} ·{" "}
            {serviceInvoiceStatusLabels[activeInvoice.status]}
          </p>
          {activeInvoice.accessKey ? <p className="break-all">Chave: {activeInvoice.accessKey}</p> : null}
          {activeInvoice.rejectionReason ? (
            <p className="text-destructive">{activeInvoice.rejectionReason}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/service-invoices/${activeInvoice.id}`}>Ver nota completa</Link>
            </Button>
            {activeInvoice.nfseXmlKey ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/api/service-invoices/${activeInvoice.id}/file?kind=nfse`}>XML NFS-e</Link>
              </Button>
            ) : null}
            {activeInvoice.danfseKey ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/api/service-invoices/${activeInvoice.id}/file?kind=danfse`}>DANFSe</Link>
              </Button>
            ) : null}
            {activeInvoice.dpsXmlKey ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/api/service-invoices/${activeInvoice.id}/file?kind=dps`}>XML DPS</Link>
              </Button>
            ) : null}
          </div>

          {activeInvoice.status === "authorized" ? (
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
        </div>
      ) : null}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
