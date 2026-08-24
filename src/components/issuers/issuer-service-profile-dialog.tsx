"use client";

import { useEffect, useState, useTransition } from "react";

import { saveIssuerServiceProfileAction } from "@/actions/issuer-service-profiles";
import {
  searchNationalServiceCodesAction,
  suggestNationalServiceCodeForCnaeAction,
} from "@/actions/reference-data";
import { AsyncCombobox, CnaeCombobox } from "@/components/issuers/async-combobox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCnaeLine } from "@/lib/format-cnae";
import { parsePercent } from "@/lib/parse-percent";
import { resolveProfileFormNbsCode, suggestNbsCodeForCnae } from "@/lib/cnae-nbs-hints";
import { formatNbsCode, isDerivedNbsCode, normalizeNbsCode } from "@/lib/format-nbs";
import {
  FIN_NFSE_OPTIONS,
  IND_DEST_OPTIONS,
  IND_FINAL_OPTIONS,
  ISSQN_CST_OPTIONS,
} from "@/lib/nfse-tributacao-options";
import type { IssuerServiceProfileInput } from "@/schemas/issuer-service-profiles";
import type { IssuerServiceProfileListItem } from "@/server/dal/issuer-service-profiles";

export type ProfileFormState = {
  name: string;
  description: string;
  cnaeCode: string;
  cnaeLabel: string;
  nationalServiceCode: string;
  nationalServiceLabel: string;
  issRate: string;
  issRetained: boolean;
  issqnCst: string;
  municipalTaxCode: string;
  nbsCode: string;
  pTotTribSn: string;
  cClassTrib: string;
  cIndOp: string;
  indDest: string;
  finNfse: string;
  indFinal: string;
  isDefault: boolean;
};

export const emptyProfileForm: ProfileFormState = {
  name: "",
  description: "",
  cnaeCode: "",
  cnaeLabel: "",
  nationalServiceCode: "",
  nationalServiceLabel: "",
  issRate: "3.0000",
  issRetained: false,
  issqnCst: "000",
  municipalTaxCode: "",
  nbsCode: "",
  pTotTribSn: "",
  cClassTrib: "000001",
  cIndOp: "050101",
  indDest: "0",
  finNfse: "0",
  indFinal: "1",
  isDefault: false,
};

export function profileToForm(profile: IssuerServiceProfileListItem): ProfileFormState {
  return {
    name: profile.name,
    description: profile.description ?? "",
    cnaeCode: profile.cnaeCode,
    cnaeLabel: formatCnaeLine(profile.cnaeCode, profile.cnaeDescription ?? profile.cnaeCode),
    nationalServiceCode: profile.nationalServiceCode,
    nationalServiceLabel: profile.nationalServiceCode,
    issRate: profile.issRate,
    issRetained: profile.issRetained,
    issqnCst: profile.issqnCst,
    municipalTaxCode: profile.municipalTaxCode ?? "",
    nbsCode: resolveProfileFormNbsCode(
      profile.nbsCode,
      profile.nationalServiceCode,
      profile.cnaeCode,
    ),
    pTotTribSn: profile.pTotTribSn ?? "",
    cClassTrib: profile.cClassTrib ?? "000001",
    cIndOp: profile.cIndOp ?? "050101",
    indDest: profile.indDest ?? "0",
    finNfse: profile.finNfse ?? "0",
    indFinal: profile.indFinal ?? "1",
    isDefault: profile.isDefault,
  };
}

export function profileFormToInput(form: ProfileFormState): IssuerServiceProfileInput {
  return {
    name: form.name || form.cnaeLabel,
    description: form.description,
    cnaeCode: form.cnaeCode,
    nationalServiceCode: form.nationalServiceCode,
    issRate: Number(form.issRate),
    issRetained: form.issRetained,
    issqnCst: form.issqnCst,
    municipalTaxCode: form.municipalTaxCode,
    nbsCode: normalizeNbsCode(form.nbsCode),
    pTotTribSn: parsePercent(form.pTotTribSn),
    cClassTrib: form.cClassTrib,
    cIndOp: form.cIndOp,
    indDest: form.indDest,
    finNfse: form.finNfse,
    indFinal: form.indFinal,
    isDefault: form.isDefault,
  };
}

export function buildProfileFormFromCadastroActivity(activity: {
  cTribMun: string;
  xTribMun?: string;
  pAliq?: string;
}): ProfileFormState {
  const issRate =
    activity.pAliq && !Number.isNaN(Number(activity.pAliq))
      ? Number(activity.pAliq).toFixed(4)
      : emptyProfileForm.issRate;

  return {
    ...emptyProfileForm,
    name: activity.xTribMun ?? `Atividade ISS ${activity.cTribMun}`,
    municipalTaxCode: activity.cTribMun,
    issRate,
  };
}

export async function buildProfileFormForCnae(cnae: {
  code: string;
  label: string;
  isPrimary?: boolean;
}): Promise<ProfileFormState> {
  const cnaeLabel = formatCnaeLine(cnae.code, cnae.label);
  const base: ProfileFormState = {
    ...emptyProfileForm,
    name: cnaeLabel,
    cnaeCode: cnae.code,
    cnaeLabel,
    municipalTaxCode: "",
    isDefault: cnae.isPrimary ?? false,
  };

  const suggestion = await suggestNationalServiceCodeForCnaeAction(cnae.code);

  return {
    ...base,
    nationalServiceCode: suggestion?.nationalServiceCode ?? "",
    nationalServiceLabel:
      suggestion && "description" in suggestion && suggestion.description
        ? `${suggestion.nationalServiceCode} — ${suggestion.description}`
        : (suggestion?.nationalServiceCode ?? ""),
    nbsCode: resolveProfileFormNbsCode(
      undefined,
      suggestion?.nationalServiceCode ?? "",
      cnae.code,
    ),
  };
}

type IssuerServiceProfileDialogProps = {
  issuerId?: string;
  profileId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: IssuerServiceProfileListItem | null;
  initialForm?: ProfileFormState | null;
  lockCnae?: boolean;
  showSimplesFields?: boolean;
  requirePTotTribSn?: boolean;
  onDraftSave?: (form: ProfileFormState) => void;
  onSaved?: () => void;
};

export function IssuerServiceProfileDialog({
  issuerId,
  profileId = null,
  open,
  onOpenChange,
  profile = null,
  initialForm = null,
  lockCnae = false,
  showSimplesFields = false,
  requirePTotTribSn = false,
  onDraftSave,
  onSaved,
}: IssuerServiceProfileDialogProps) {
  const [form, setForm] = useState<ProfileFormState>(emptyProfileForm);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialForm) {
      setForm(initialForm);
      setMessage(null);
      return;
    }

    setForm(profile ? profileToForm(profile) : emptyProfileForm);
    setMessage(null);
  }, [open, profile, initialForm]);

  async function handleCnaeSelect(option: { value: string; label: string }) {
    const next = await buildProfileFormForCnae({ code: option.value, label: option.label });
    setForm((prev) => ({
      ...next,
      name: prev.name || next.name,
      description: prev.description,
      issRate: prev.issRate,
      issRetained: prev.issRetained,
      issqnCst: prev.issqnCst,
      municipalTaxCode: prev.municipalTaxCode || next.municipalTaxCode,
      pTotTribSn: prev.pTotTribSn,
      cClassTrib: prev.cClassTrib || next.cClassTrib,
      cIndOp: prev.cIndOp || next.cIndOp,
      indDest: prev.indDest,
      finNfse: prev.finNfse,
      indFinal: prev.indFinal,
      isDefault: prev.isDefault,
      nbsCode: next.nbsCode || prev.nbsCode,
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      if (!issuerId) {
        onDraftSave?.(form);
        onOpenChange(false);
        return;
      }

      const result = await saveIssuerServiceProfileAction(
        issuerId,
        profileId ?? profile?.id ?? null,
        profileFormToInput(form),
      );

      if (result.errors) {
        setMessage(Object.values(result.errors).flat().join(", "));
        return;
      }

      if (result.message) {
        setMessage(result.message);
        return;
      }

      onSaved?.();
      onOpenChange(false);
    });
  }

  const nbsDisplay = form.nbsCode
    ? formatNbsCode(form.nbsCode.replace(/\D/g, "").padStart(9, "0"))
    : "";
  const isEditing = Boolean(profileId ?? profile?.id ?? initialForm);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar tributação" : "Nova tributação"}</DialogTitle>
          <DialogDescription>
            Configure os atributos fiscais deste CNAE para emissão de NFS-e.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="profile-name">Nome da tributação</Label>
            <Input
              id="profile-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </div>

          <AsyncCombobox
            label="Cód. tributação nacional (cTribNac)"
            placeholder="Buscar código LC 116"
            value={form.nationalServiceCode}
            displayValue={form.nationalServiceLabel}
            searchAction={async (query) => {
              const rows = await searchNationalServiceCodesAction({ q: query, limit: 20 });
              return rows.map((row) => ({
                value: row.code,
                label: row.code,
                description: row.description,
              }));
            }}
            onSelect={(option) => {
              setForm((prev) => {
                const nbsFromOption = normalizeNbsCode(option.nbsCode);
                const keepNbs =
                  prev.nbsCode &&
                  !isDerivedNbsCode(prev.nbsCode, option.value);

                return {
                  ...prev,
                  nationalServiceCode: option.value,
                  nationalServiceLabel: option.description
                    ? `${option.value} — ${option.description}`
                    : option.value,
                  nbsCode: keepNbs
                    ? prev.nbsCode
                    : nbsFromOption && !isDerivedNbsCode(nbsFromOption, option.value)
                      ? nbsFromOption
                      : resolveProfileFormNbsCode(undefined, option.value, prev.cnaeCode),
                };
              });
            }}
          />

          <div className="space-y-2">
            <Label htmlFor="municipal-tax-code">Cód. tributação municipal ISS (cTribMun)</Label>
            <Input
              id="municipal-tax-code"
              value={form.municipalTaxCode}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  municipalTaxCode: event.target.value.replace(/\D/g, "").slice(0, 7),
                }))
              }
              placeholder="Ex.: 7, 1402 ou 6201501"
              inputMode="numeric"
              maxLength={7}
            />
            <p className="text-xs text-muted-foreground">
              Código ISS retornado pela prefeitura. Em Cuiabá pode vir no formato CNAE (7 dígitos).
              Na emissão nacional, só códigos de até 3 dígitos entram no XML; demais ficam omitidos.
            </p>
          </div>

          {lockCnae ? (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cnae-code">CNAE do serviço</Label>
              <Input id="cnae-code" value={form.cnaeLabel || form.cnaeCode} readOnly />
            </div>
          ) : (
            <div className="md:col-span-2">
              <CnaeCombobox
                label="CNAE do serviço"
                value={form.cnaeCode}
                displayValue={form.cnaeLabel}
                onSelect={handleCnaeSelect}
              />
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="nbs-code">NBS (cNBS)</Label>
            <Input
              id="nbs-code"
              value={form.nbsCode}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  nbsCode: event.target.value.replace(/\D/g, "").slice(0, 9),
                }))
              }
              placeholder="Ex.: 120018100"
              inputMode="numeric"
              autoComplete="off"
              maxLength={9}
            />
            {nbsDisplay ? (
              <p className="text-xs text-muted-foreground">Formato NBS: {nbsDisplay}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Obrigatório para enviar informações IBS/CBS na DPS. Use o código oficial da tabela
              NBS (9 dígitos). Para reparação de eletroeletrônicos (CNAE 9521), use{" "}
              <strong>120018100</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iss-rate">Alíquota ISS (%)</Label>
            <Input
              id="iss-rate"
              type="number"
              step="0.0001"
              min="0"
              max="100"
              value={form.issRate}
              onChange={(event) => setForm((prev) => ({ ...prev, issRate: event.target.value }))}
              required
            />
          </div>

          {showSimplesFields ? (
            <div className="space-y-2">
              <Label htmlFor="p-tot-trib-sn">
                % Total tributos SN (pTotTribSN)
                {requirePTotTribSn ? " *" : null}
              </Label>
              <Input
                id="p-tot-trib-sn"
                type="number"
                step="0.0001"
                min="0"
                max="100"
                value={form.pTotTribSn}
                onChange={(event) => setForm((prev) => ({ ...prev, pTotTribSn: event.target.value }))}
                required={requirePTotTribSn}
              />
              {requirePTotTribSn ? (
                <p className="text-xs text-muted-foreground">
                  Obrigatório para ME/EPP. Informe a alíquota efetiva total de tributos do Simples
                  (ex.: 6,00).
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="issqn-cst">CST</Label>
            <Select
              value={form.issqnCst}
              onValueChange={(value) => setForm((prev) => ({ ...prev, issqnCst: value }))}
            >
              <SelectTrigger id="issqn-cst">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISSQN_CST_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-class-trib">Classificação tributária (cClassTrib)</Label>
            <Input
              id="c-class-trib"
              value={form.cClassTrib}
              onChange={(event) => setForm((prev) => ({ ...prev, cClassTrib: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-ind-op">Código indicador da operação (cIndOp)</Label>
            <Input
              id="c-ind-op"
              value={form.cIndOp}
              onChange={(event) => setForm((prev) => ({ ...prev, cIndOp: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ind-dest">indDest</Label>
            <Select
              value={form.indDest}
              onValueChange={(value) => setForm((prev) => ({ ...prev, indDest: value }))}
            >
              <SelectTrigger id="ind-dest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IND_DEST_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fin-nfse">finNFSe</Label>
            <Select
              value={form.finNfse}
              onValueChange={(value) => setForm((prev) => ({ ...prev, finNfse: value }))}
            >
              <SelectTrigger id="fin-nfse">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIN_NFSE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ind-final">indFinal</Label>
            <Select
              value={form.indFinal}
              onValueChange={(value) => setForm((prev) => ({ ...prev, indFinal: value }))}
            >
              <SelectTrigger id="ind-final">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IND_FINAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="profile-description">Descrição padrão do serviço (opcional)</Label>
            <Input
              id="profile-description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.issRetained}
              onChange={(event) => setForm((prev) => ({ ...prev, issRetained: event.target.checked }))}
            />
            ISS retido pelo tomador
          </label>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => setForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
            />
            Definir como tributação padrão deste emissor
          </label>

          {message ? <p className="text-sm text-destructive md:col-span-2">{message}</p> : null}

          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : isEditing ? "Salvar alterações" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
