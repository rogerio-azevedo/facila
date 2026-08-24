"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  CheckIcon,
  ClockIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format-currency";
import {
  countEmissionProgress,
  getEmissionDialogDescription,
  getEmissionDialogTitle,
  type NfseEmissionProgressItem,
  type NfseEmissionProgressState,
} from "@/lib/nfse-emission-progress";
import { cn } from "@/lib/utils";

type NfseEmissionProgressDialogProps = {
  open: boolean;
  items: NfseEmissionProgressItem[];
  running: boolean;
  onClose: () => void;
  onRetryFailed?: () => void;
};

function EmissionProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function EmissionStateIcon({ state }: { state: NfseEmissionProgressState }) {
  if (state === "processing") {
    return <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" aria-hidden />;
  }

  if (state === "success") {
    return <CheckIcon className="size-4 shrink-0 text-emerald-600" aria-hidden />;
  }

  if (state === "retry") {
    return <ClockIcon className="size-4 shrink-0 text-amber-600" aria-hidden />;
  }

  if (state === "error") {
    return <XIcon className="size-4 shrink-0 text-destructive" aria-hidden />;
  }

  return <ClockIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
}

function getEmissionStatusLabel(item: NfseEmissionProgressItem) {
  switch (item.state) {
    case "pending":
      return "Na fila";
    case "processing":
      return "Enviando para a Receita Federal…";
    case "success":
      return item.dpsNumber ? `Autorizada · DPS ${item.dpsNumber}` : "Autorizada";
    case "retry":
      return item.message ?? "Aguardando nova tentativa na Receita Federal";
    case "error":
      return item.message ?? "Falha na emissão";
  }
}

function formatEmissionErrorMessage(message: string) {
  return message
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function EmissionProgressRow({
  item,
  rowRef,
}: {
  item: NfseEmissionProgressItem;
  rowRef?: React.RefObject<HTMLLIElement | null>;
}) {
  const statusLabel = getEmissionStatusLabel(item);
  const errorMessages =
    item.state === "error" && item.message ? formatEmissionErrorMessage(item.message) : [];

  return (
    <li
      ref={rowRef}
      className={cn(
        "rounded-md border px-3 py-2.5 transition-colors",
        item.state === "processing" && "border-primary/40 bg-primary/5",
        item.state === "success" && "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
        item.state === "error" && "border-destructive/30 bg-destructive/5",
        item.state === "retry" && "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
      )}
    >
      <div className="flex items-start gap-3">
        <EmissionStateIcon state={item.state} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="font-medium">{item.label}</p>
            {item.amount ? (
              <p className="text-sm text-muted-foreground">{formatCurrency(item.amount)}</p>
            ) : null}
          </div>
          {item.state === "error" && errorMessages.length > 1 ? (
            <ul className="list-inside list-disc space-y-0.5 text-sm text-destructive">
              {errorMessages.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p
              className={cn(
                "text-sm",
                item.state === "error"
                  ? "text-destructive"
                  : item.state === "success"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : item.state === "retry"
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground",
              )}
            >
              {statusLabel}
            </p>
          )}
          {item.state === "success" && item.serviceInvoiceId ? (
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
              <Link href={`/service-invoices/${item.serviceInvoiceId}`}>Ver nota</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function NfseEmissionProgressDialog({
  open,
  items,
  running,
  onClose,
  onRetryFailed,
}: NfseEmissionProgressDialogProps) {
  const counts = countEmissionProgress(items);
  const processingItemId = items.find((item) => item.state === "processing")?.id;
  const processingRowRef = useRef<HTMLLIElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!processingItemId || !processingRowRef.current || !listRef.current) {
      return;
    }

    processingRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [processingItemId]);

  function handleOpenChange(nextOpen: boolean) {
    if (running) {
      return;
    }

    if (!nextOpen) {
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-lg gap-0 overflow-hidden p-0"
        showCloseButton={!running}
        onInteractOutside={(event) => {
          if (running) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (running) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="space-y-3 border-b px-6 py-4">
          <div className="space-y-1">
            <DialogTitle>{getEmissionDialogTitle(running, counts)}</DialogTitle>
            <DialogDescription>{getEmissionDialogDescription(running, counts)}</DialogDescription>
          </div>
          <EmissionProgressBar percent={counts.progressPercent} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{counts.success} autorizada(s)</span>
            {counts.failed > 0 ? <span>{counts.failed} com falha</span> : null}
            {counts.retry > 0 ? <span>{counts.retry} aguardando retry</span> : null}
            {counts.pending + counts.processing > 0 ? (
              <span>{counts.pending + counts.processing} na fila</span>
            ) : null}
          </div>
        </DialogHeader>

        <ul ref={listRef} className="max-h-80 space-y-2 overflow-y-auto px-6 py-4 text-sm">
          {items.map((item) => (
            <EmissionProgressRow
              key={item.id}
              item={item}
              rowRef={item.id === processingItemId ? processingRowRef : undefined}
            />
          ))}
        </ul>

        <DialogFooter className="flex-col gap-2 border-t px-6 py-4 sm:flex-col sm:justify-stretch">
          {running ? (
            <p className="text-center text-xs text-muted-foreground">Não feche esta janela enquanto a emissão estiver em andamento.</p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {!running && counts.failed > 0 && onRetryFailed ? (
              <Button variant="outline" onClick={onRetryFailed} className="sm:mr-auto">
                Tentar novamente as falhas
              </Button>
            ) : null}
            <Button variant="outline" disabled={running} onClick={onClose} className="w-full sm:w-auto">
              {running ? "Processando..." : "Fechar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
