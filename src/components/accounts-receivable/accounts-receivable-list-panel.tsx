"use client";

import { useMemo, useState } from "react";

import {
  AccountsReceivableTable,
  type AccountReceivableTableRow,
} from "@/components/accounts-receivable/accounts-receivable-table";
import { NfseEmissionProgressDialog } from "@/components/service-invoices/nfse-emission-progress-dialog";
import { Button } from "@/components/ui/button";
import { useNfseBatchEmission } from "@/hooks/use-nfse-batch-emission";
import {
  canEmitNfseForAccountReceivable,
  getAccountReceivableRowLabel,
} from "@/lib/account-receivable-nfse-eligibility";

type AccountsReceivableListPanelProps = {
  rows: AccountReceivableTableRow[];
};

export function AccountsReceivableListPanel({ rows }: AccountsReceivableListPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const { open, items, running, startEmission, retryFailed, close } = useNfseBatchEmission();

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.id)),
    [rows, selectedIds],
  );

  const selectedEmittableRows = useMemo(
    () => selectedRows.filter(canEmitNfseForAccountReceivable),
    [selectedRows],
  );

  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const someSelected = rows.some((row) => selectedIds.has(row.id));

  function toggleSelection(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(rows.map((row) => row.id)));
      return;
    }

    setSelectedIds(new Set());
  }

  function handleEmitNfse() {
    startEmission(
      selectedEmittableRows.map((row) => ({
        id: row.id,
        label: getAccountReceivableRowLabel(row),
        amount: row.amount,
      })),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedIds.size > 0
            ? `${selectedIds.size} selecionada(s) · ${selectedEmittableRows.length} elegível(is) para NFS-e`
            : "Selecione contas para emitir NFS-e em lote"}
        </p>
        <Button
          variant="outline"
          disabled={selectedEmittableRows.length === 0 || running}
          onClick={handleEmitNfse}
          className="shrink-0"
        >
          {running ? "Emitindo..." : "Emitir NFS-e"}
        </Button>
      </div>

      <AccountsReceivableTable
        rows={rows}
        showClient
        selectable
        selectedIds={selectedIds}
        onToggleSelection={toggleSelection}
        onToggleSelectAll={toggleSelectAll}
        allSelected={allSelected}
        someSelected={someSelected}
      />

      <NfseEmissionProgressDialog
        open={open}
        items={items}
        running={running}
        onClose={close}
        onRetryFailed={retryFailed}
      />
    </div>
  );
}
