"use client";

import { CheckIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { saveIssuerServiceProfileAction } from "@/actions/issuer-service-profiles";
import {
  resolveCnaeFromMunicipalActivityAction,
  suggestNationalServiceCodeForCnaeAction,
  suggestNbsCodeForCnaeAction,
} from "@/actions/reference-data";
import {
  AsyncCombobox,
  CnaeCombobox,
  searchNationalServiceCombobox,
} from "@/components/issuers/async-combobox";
import { emptyProfileForm } from "@/components/issuers/issuer-service-profile-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePercent } from "@/lib/parse-percent";
import {
  findProfilesMatchingMunicipalActivity,
  isMunicipalActivityCnaeCode,
  municipalActivityLabel,
} from "@/lib/municipal-activity-cnae";
import type { IssuerServiceProfileInput } from "@/schemas/issuer-service-profiles";
import type { MunicipalCadastroActivity } from "@/schemas/municipal-cadastro";
import type { IssuerServiceProfileListItem } from "@/server/dal/issuer-service-profiles";
import { cn } from "@/lib/utils";

type ActivityRowState = {
  cnaeCode: string;
  cnaeLabel: string;
  nationalServiceCode: string;
  nationalServiceLabel: string;
  nbsCode: string;
  pTotTribSn: string;
  error: string | null;
  successCount: number;
};

type MunicipalCadastroActivitiesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issuerId: string;
  loading: boolean;
  error: string | null;
  activities: MunicipalCadastroActivity[];
  meta: { xNome?: string; statusCadastro?: string };
  profiles: IssuerServiceProfileListItem[];
  requirePTotTribSn?: boolean;
  onCreated: () => void;
  refreshOnClose?: boolean;
};

function activityRowKey(activity: MunicipalCadastroActivity, index: number) {
  return `${activity.cTribMun}-${activity.xTribMun ?? ""}-${index}`;
}

function emptyRowState(): ActivityRowState {
  return {
    cnaeCode: "",
    cnaeLabel: "",
    nationalServiceCode: "",
    nationalServiceLabel: "",
    nbsCode: "",
    pTotTribSn: "",
    error: null,
    successCount: 0,
  };
}

function buildProfileInputFromRow(
  activity: MunicipalCadastroActivity,
  row: ActivityRowState,
): IssuerServiceProfileInput {
  const issRate =
    activity.pAliq && !Number.isNaN(Number(activity.pAliq))
      ? Number(activity.pAliq)
      : Number(emptyProfileForm.issRate);

  return {
    name: activity.xTribMun ?? `Atividade ISS ${activity.cTribMun}`,
    description: "",
    cnaeCode: row.cnaeCode,
    nationalServiceCode: row.nationalServiceCode,
    issRate,
    issRetained: false,
    issqnCst: emptyProfileForm.issqnCst,
    municipalTaxCode: activity.cTribMun,
    nbsCode: row.nbsCode || undefined,
    pTotTribSn: parsePercent(row.pTotTribSn),
    cClassTrib: emptyProfileForm.cClassTrib,
    cIndOp: emptyProfileForm.cIndOp,
    indDest: emptyProfileForm.indDest,
    finNfse: emptyProfileForm.finNfse,
    indFinal: emptyProfileForm.indFinal,
    isDefault: false,
  };
}

function validateRow(row: ActivityRowState, requirePTotTribSn: boolean): string | null {
  if (!row.cnaeCode) {
    return "Selecione o CNAE da empresa.";
  }

  if (!row.nationalServiceCode) {
    return "Selecione o código de tributação nacional (cTribNac).";
  }

  if (requirePTotTribSn && parsePercent(row.pTotTribSn) === undefined) {
    return "Informe o % total de tributos SN (pTotTribSN).";
  }

  return null;
}

function formatExistingProfilesSummary(profiles: IssuerServiceProfileListItem[]): string {
  if (profiles.length === 0) {
    return "";
  }

  const first = profiles[0];
  const firstCode = first.nationalServiceCode;
  if (profiles.length === 1) {
    return `cTribNac ${firstCode}`;
  }

  return `cTribNac ${firstCode} (+${profiles.length - 1})`;
}

type MunicipalCadastroActivityRowProps = {
  activity: MunicipalCadastroActivity;
  rowKey: string;
  row: ActivityRowState;
  existingProfiles: IssuerServiceProfileListItem[];
  requirePTotTribSn: boolean;
  onRowChange: (rowKey: string, patch: Partial<ActivityRowState>) => void;
  onCnaeSelect: (rowKey: string, option: { value: string; label: string }) => void;
  onAdd: (rowKey: string) => void;
  saving: boolean;
};

function MunicipalCadastroActivityRow({
  activity,
  rowKey,
  row,
  existingProfiles,
  requirePTotTribSn,
  onRowChange,
  onCnaeSelect,
  onAdd,
  saving,
}: MunicipalCadastroActivityRowProps) {
  const isRegistered = existingProfiles.length > 0;
  const hasSuccess = row.successCount > 0;
  const showAsRegistered = isRegistered || hasSuccess;
  const existingSummary = formatExistingProfilesSummary(existingProfiles);

  return (
    <li
      className={cn(
        "rounded-lg border p-4",
        (showAsRegistered) &&
          "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20",
      )}
    >
      <div className="mb-4 space-y-1">
        <p className="text-sm font-medium">
          {municipalActivityLabel(activity.cTribMun)} {activity.cTribMun}
          {activity.pAliq ? ` · ${activity.pAliq}% ISS` : null}
        </p>
        {isMunicipalActivityCnaeCode(activity.cTribMun) ? (
          <p className="text-xs text-muted-foreground">
            Em Cuiabá, a prefeitura usa o código CNAE no campo cTribMun — preenchido abaixo.
          </p>
        ) : null}
        {activity.xTribMun ? (
          <p className="text-sm text-muted-foreground">{activity.xTribMun}</p>
        ) : null}
        {hasSuccess ? (
          <p className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckIcon className="size-3.5" />
            {row.successCount} tributação(ões) criada(s) nesta atividade
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-2">
          <CnaeCombobox
            label="CNAE da empresa"
            value={row.cnaeCode}
            displayValue={row.cnaeLabel}
            onSelect={(option) => onCnaeSelect(rowKey, option)}
          />
          {showAsRegistered ? (
            <p className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckIcon className="size-3.5 shrink-0" />
              <span>
                Já cadastrado
                {existingSummary ? ` · ${existingSummary}` : null}
              </span>
            </p>
          ) : null}
        </div>

        <AsyncCombobox
          label="Cód. tributação nacional (cTribNac)"
          placeholder="Buscar código LC 116"
          value={row.nationalServiceCode}
          displayValue={row.nationalServiceLabel}
          searchAction={searchNationalServiceCombobox}
          onSelect={(option) => {
            onRowChange(rowKey, {
              nationalServiceCode: option.value,
              nationalServiceLabel: option.description
                ? `${option.value} — ${option.description}`
                : option.value,
              error: null,
            });
          }}
        />

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          {requirePTotTribSn ? (
            <div className="space-y-2">
              <Label htmlFor={`p-tot-trib-sn-${rowKey}`}>pTotTribSN (%)</Label>
              <Input
                id={`p-tot-trib-sn-${rowKey}`}
                type="number"
                step="0.0001"
                min="0"
                max="100"
                value={row.pTotTribSn}
                onChange={(event) =>
                  onRowChange(rowKey, { pTotTribSn: event.target.value, error: null })
                }
              />
            </div>
          ) : null}

          <Button type="button" disabled={saving} onClick={() => onAdd(rowKey)}>
            {saving ? "Salvando…" : showAsRegistered ? "Adicionar outra tributação" : "Adicionar tributação"}
          </Button>
        </div>
      </div>

      {row.error ? <p className="mt-3 text-sm text-destructive">{row.error}</p> : null}
    </li>
  );
}

export function MunicipalCadastroActivitiesDialog({
  open,
  onOpenChange,
  issuerId,
  loading,
  error,
  activities,
  meta,
  profiles,
  requirePTotTribSn = false,
  onCreated,
  refreshOnClose = false,
}: MunicipalCadastroActivitiesDialogProps) {
  const [rowStates, setRowStates] = useState<Record<string, ActivityRowState>>({});
  const [initializingRows, setInitializingRows] = useState(false);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open || activities.length === 0) {
      setInitializingRows(false);
      return;
    }

    let cancelled = false;
    setInitializingRows(true);

    async function initializeRows() {
      const entries = await Promise.all(
        activities.map(async (activity, index) => {
          const key = activityRowKey(activity, index);
          const base = emptyRowState();
          const resolved = await resolveCnaeFromMunicipalActivityAction(activity);

          return [
            key,
            resolved
              ? {
                  ...base,
                  ...resolved,
                }
              : base,
          ] as const;
        }),
      );

      if (!cancelled) {
        setRowStates(Object.fromEntries(entries));
        setInitializingRows(false);
      }
    }

    void initializeRows();

    return () => {
      cancelled = true;
    };
  }, [open, activities]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && createdCount > 0 && refreshOnClose) {
      onCreated();
    }
    if (!nextOpen) {
      setCreatedCount(0);
      setRowStates({});
    }
    onOpenChange(nextOpen);
  }

  function updateRow(rowKey: string, patch: Partial<ActivityRowState>) {
    setRowStates((prev) => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] ?? emptyRowState()), ...patch },
    }));
  }

  async function handleCnaeSelect(rowKey: string, option: { value: string; label: string }) {
    const [suggestion, nbsHint] = await Promise.all([
      suggestNationalServiceCodeForCnaeAction(option.value),
      suggestNbsCodeForCnaeAction(option.value),
    ]);

    const patch: Partial<ActivityRowState> = {
      cnaeCode: option.value,
      cnaeLabel: option.label,
      error: null,
    };

    if (suggestion) {
      patch.nationalServiceCode = suggestion.nationalServiceCode;
      patch.nationalServiceLabel =
        "description" in suggestion && suggestion.description
          ? `${suggestion.nationalServiceCode} — ${suggestion.description}`
          : suggestion.nationalServiceCode;
    }

    if (nbsHint?.nbsCode) {
      patch.nbsCode = nbsHint.nbsCode;
    }

    updateRow(rowKey, patch);
  }

  function handleAdd(rowKey: string) {
    const row = rowStates[rowKey];
    const activityIndex = activities.findIndex(
      (activity, index) => activityRowKey(activity, index) === rowKey,
    );
    const activity = activityIndex >= 0 ? activities[activityIndex] : null;

    if (!row || !activity) {
      return;
    }

    const validationError = validateRow(row, requirePTotTribSn);
    if (validationError) {
      updateRow(rowKey, { error: validationError });
      return;
    }

    const input = buildProfileInputFromRow(activity, row);

    startTransition(async () => {
      setSavingRowKey(rowKey);
      const result = await saveIssuerServiceProfileAction(issuerId, null, input);
      setSavingRowKey(null);

      if (result.errors) {
        const message = Object.values(result.errors).flat().filter(Boolean).join(", ");
        updateRow(rowKey, { error: message || "Falha ao salvar tributação." });
        return;
      }

      if (result.message) {
        updateRow(rowKey, { error: result.message });
        return;
      }

      updateRow(rowKey, {
        error: null,
        successCount: row.successCount + 1,
      });
      setCreatedCount((count) => count + 1);
      if (!refreshOnClose) {
        onCreated();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-2 border-b px-6 py-4">
          <DialogTitle>Atividades ISS — cadastro municipal</DialogTitle>
          <DialogDescription>
            {meta.xNome
              ? `${meta.xNome}${meta.statusCadastro ? ` · ${meta.statusCadastro}` : ""}`
              : "Atividades autorizadas na prefeitura para este emissor."}
          </DialogDescription>
          <p className="text-sm text-muted-foreground">
            A prefeitura informa as atividades ISS autorizadas. Em Cuiabá, o cTribMun costuma ser o
            próprio CNAE — já preenchemos automaticamente quando possível. Confira o cTribNac e
            adicione a tributação. Emissão pelo padrão nacional (Receita Federal).
          </p>
        </DialogHeader>

        <div className="max-h-[min(70vh,640px)] overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Consultando ISSNet…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : initializingRows ? (
            <p className="text-sm text-muted-foreground">Preenchendo CNAE e cTribNac…</p>
          ) : activities.length > 0 ? (
            <ul className="space-y-4">
              {activities.map((activity, index) => {
                const key = activityRowKey(activity, index);
                const row = rowStates[key] ?? emptyRowState();
                const existingProfiles = findProfilesMatchingMunicipalActivity(
                  activity,
                  row.cnaeCode,
                  profiles,
                );

                return (
                  <MunicipalCadastroActivityRow
                    key={key}
                    activity={activity}
                    rowKey={key}
                    row={row}
                    existingProfiles={existingProfiles}
                    requirePTotTribSn={requirePTotTribSn}
                    onRowChange={updateRow}
                    onCnaeSelect={handleCnaeSelect}
                    onAdd={handleAdd}
                    saving={savingRowKey === key}
                  />
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma atividade encontrada.</p>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          {createdCount > 0 ? (
            <p className="mr-auto text-sm text-muted-foreground">
              {createdCount} tributação(ões) adicionada(s)
              {refreshOnClose ? " — a lista atualiza ao fechar." : null}
            </p>
          ) : null}
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
