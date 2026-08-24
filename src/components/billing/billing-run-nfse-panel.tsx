"use client";

import { useMemo, useState } from "react";

import { NfseEmissionProgressDialog } from "@/components/service-invoices/nfse-emission-progress-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNfseBatchEmission } from "@/hooks/use-nfse-batch-emission";
import { formatCurrency, formatDate } from "@/lib/format-currency";
import { canEmitNfseByStatus } from "@/lib/account-receivable-nfse-eligibility";
import { billingRunItemStatusLabels } from "@/schemas/billing-runs";
import { accountReceivableNfseStatusLabels } from "@/schemas/service-invoices";

export type BillingRunNfseItem = {
  id: string;
  contractId: string;
  contractName: string;
  clientName: string;
  accountReceivableId: string | null;
  amount: string | null;
  dueDate: Date | null;
  status: "generated" | "skipped" | "error";
  nfseStatus: "none" | "pending" | "authorized" | "rejected" | "error" | "canceled" | null;
  skipReason: string | null;
  errorMessage: string | null;
};

type BillingRunNfsePanelProps = {
  items: BillingRunNfseItem[];
};

function getEmittableItems(items: BillingRunNfseItem[]) {
  return items.filter(
    (item) =>
      item.status === "generated" &&
      item.accountReceivableId &&
      canEmitNfseByStatus("pending", item.nfseStatus ?? "none"),
  );
}

export function BillingRunNfsePanel({ items }: BillingRunNfsePanelProps) {
  const emittableItems = useMemo(() => getEmittableItems(items), [items]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(
      emittableItems
        .map((item) => item.accountReceivableId)
        .filter((id): id is string => Boolean(id)),
    );
  });
  const { open, items: progressItems, running, startEmission, retryFailed, close } =
    useNfseBatchEmission();

  const selectedItems = emittableItems.filter(
    (item) => item.accountReceivableId && selectedIds.has(item.accountReceivableId),
  );

  const allSelected =
    emittableItems.length > 0 &&
    emittableItems.every(
      (item) => item.accountReceivableId && selectedIds.has(item.accountReceivableId),
    );
  const someSelected = emittableItems.some(
    (item) => item.accountReceivableId && selectedIds.has(item.accountReceivableId),
  );

  function toggleSelection(accountReceivableId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(accountReceivableId);
      } else {
        next.delete(accountReceivableId);
      }
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(
        new Set(
          emittableItems
            .map((item) => item.accountReceivableId)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      return;
    }

    setSelectedIds(new Set());
  }

  function handleEmit() {
    const targets = selectedItems.filter((item) => item.accountReceivableId);

    startEmission(
      targets.map((item) => ({
        id: item.accountReceivableId!,
        label: `${item.clientName} · ${item.contractName}`,
        amount: item.amount ?? undefined,
      })),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          {emittableItems.length} título(s) elegível(is) para emissão de NFS-e
        </p>
        <Button
          disabled={selectedItems.length === 0 || running}
          onClick={handleEmit}
          className="shrink-0"
        >
          Emitir NFS-e selecionadas
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 w-10 py-2">
                {emittableItems.length > 0 ? (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(element) => {
                      if (element) {
                        element.indeterminate = someSelected && !allSelected;
                      }
                    }}
                    onChange={(event) => toggleSelectAll(event.target.checked)}
                    aria-label="Selecionar todos os títulos elegíveis"
                  />
                ) : null}
              </TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status do lote</TableHead>
              <TableHead>NFS-e</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                  Nenhum item neste lote
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const canSelect =
                  item.status === "generated" &&
                  item.accountReceivableId &&
                  canEmitNfseByStatus("pending", item.nfseStatus ?? "none");

                return (
                  <TableRow key={item.id}>
                    <TableCell className="py-2">
                      {canSelect && item.accountReceivableId ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.accountReceivableId)}
                          onChange={(event) =>
                            toggleSelection(item.accountReceivableId!, event.target.checked)
                          }
                          aria-label={`Selecionar ${item.contractName}`}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="py-2">{item.clientName}</TableCell>
                    <TableCell className="py-2">{item.contractName}</TableCell>
                    <TableCell className="py-2">
                      {item.amount ? formatCurrency(item.amount) : "-"}
                    </TableCell>
                    <TableCell className="py-2">
                      {item.dueDate ? formatDate(item.dueDate) : "-"}
                    </TableCell>
                    <TableCell className="py-2">
                      {billingRunItemStatusLabels[item.status]}
                      {item.skipReason ? (
                        <span className="block text-xs text-muted-foreground">
                          {item.skipReason}
                        </span>
                      ) : null}
                      {item.errorMessage ? (
                        <span className="block text-xs text-destructive">{item.errorMessage}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="py-2">
                      {item.nfseStatus ? accountReceivableNfseStatusLabels[item.nfseStatus] : "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <NfseEmissionProgressDialog
        open={open}
        items={progressItems}
        running={running}
        onClose={close}
        onRetryFailed={retryFailed}
      />
    </div>
  );
}
