"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { generateBatchBillingAction } from "@/actions/billing-runs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompetenceLabel } from "@/lib/billing";
import { formatCurrency, formatDate } from "@/lib/format-currency";
import type { BatchBillingPreviewItem } from "@/modules/billing/preview";
import {
  batchBillingPreviewStatusLabels,
  type BillingRunFormState,
} from "@/schemas/billing-runs";

type BatchBillingPanelProps = {
  initialCompetenceMonth: string;
  initialPreview: {
    items: BatchBillingPreviewItem[];
    readyCount: number;
    readyTotalAmount: number;
  };
};

export function BatchBillingPanel({
  initialCompetenceMonth,
  initialPreview,
}: BatchBillingPanelProps) {
  const router = useRouter();
  const [competenceMonth, setCompetenceMonth] = useState(initialCompetenceMonth);
  const [preview, setPreview] = useState(initialPreview);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(
      initialPreview.items
        .filter((item) => item.status === "ready")
        .map((item) => item.contractId),
    );
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, setState] = useState<BillingRunFormState>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPreview(initialPreview);
    setSelectedIds(
      new Set(
        initialPreview.items
          .filter((item) => item.status === "ready")
          .map((item) => item.contractId),
      ),
    );
  }, [initialPreview, competenceMonth]);

  const readyItems = useMemo(
    () => preview.items.filter((item) => item.status === "ready"),
    [preview.items],
  );

  const selectedReadyItems = useMemo(
    () => readyItems.filter((item) => selectedIds.has(item.contractId)),
    [readyItems, selectedIds],
  );

  const selectedTotal = selectedReadyItems.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  const allReadySelected =
    readyItems.length > 0 &&
    readyItems.every((item) => selectedIds.has(item.contractId));
  const someReadySelected = readyItems.some((item) => selectedIds.has(item.contractId));

  const handleCompetenceChange = (value: string) => {
    setCompetenceMonth(value);
    router.replace(`/billing?competenceMonth=${value}`);
  };

  const toggleSelection = (contractId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(contractId);
      } else {
        next.delete(contractId);
      }
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(readyItems.map((item) => item.contractId)));
      return;
    }

    setSelectedIds(new Set());
  };

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateBatchBillingAction({
        competenceMonth,
        contractIds: [...selectedIds],
      });

      if (!result.success) {
        setState(result);
        setShowConfirm(false);
        return;
      }

      setShowConfirm(false);
      router.push("/accounts-receivable");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="month"
            value={competenceMonth}
            onChange={(event) => handleCompetenceChange(event.target.value)}
            className="w-full sm:w-45"
            aria-label="Competência"
          />
          <p className="text-sm text-muted-foreground">
            {preview.readyCount} prontos · {formatCurrency(preview.readyTotalAmount)}
          </p>
        </div>

        <Button
          disabled={selectedReadyItems.length === 0 || isPending}
          onClick={() => setShowConfirm(true)}
          className="shrink-0"
        >
          Gerar contas a receber
        </Button>
      </div>

      {state.errors?.form ? (
        <p className="text-sm text-destructive">{state.errors.form.join(", ")}</p>
      ) : null}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 w-10 py-2">
                {readyItems.length > 0 ? (
                  <input
                    type="checkbox"
                    checked={allReadySelected}
                    ref={(element) => {
                      if (element) {
                        element.indeterminate = someReadySelected && !allReadySelected;
                      }
                    }}
                    onChange={(event) => toggleSelectAll(event.target.checked)}
                    aria-label="Selecionar todos os contratos prontos"
                  />
                ) : null}
              </TableHead>
              <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Cliente
              </TableHead>
              <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Contrato
              </TableHead>
              <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Valor
              </TableHead>
              <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Vencimento
              </TableHead>
              <TableHead className="h-9 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                  Nenhum contrato ativo encontrado
                </TableCell>
              </TableRow>
            ) : (
              preview.items.map((item) => (
                <TableRow key={item.contractId}>
                  <TableCell className="py-2">
                    {item.status === "ready" ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.contractId)}
                        onChange={(event) =>
                          toggleSelection(item.contractId, event.target.checked)
                        }
                        aria-label={`Selecionar ${item.contractName}`}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="py-2">{item.clientName}</TableCell>
                  <TableCell className="py-2">{item.contractName}</TableCell>
                  <TableCell className="py-2">{formatCurrency(item.amount)}</TableCell>
                  <TableCell className="py-2">{formatDate(item.dueDate)}</TableCell>
                  <TableCell className="py-2">
                    {batchBillingPreviewStatusLabels[item.status]}
                    {item.skipReason ? (
                      <span className="block text-xs text-muted-foreground">
                        {item.skipReason}
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmar geração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gerar {selectedReadyItems.length} conta(s) a receber totalizando{" "}
                {formatCurrency(selectedTotal)} para {formatCompetenceLabel(competenceMonth)}?
              </p>
              <div className="flex gap-2">
                <Button onClick={handleGenerate} disabled={isPending}>
                  {isPending ? "Gerando..." : "Confirmar"}
                </Button>
                <Button variant="outline" onClick={() => setShowConfirm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
