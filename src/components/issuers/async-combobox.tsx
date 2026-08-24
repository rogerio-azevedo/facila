"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import {
  ensureCnaeCodeAction,
  searchCnaeCodesAction,
  searchMunicipalitiesAction,
  searchNationalServiceCodesAction,
} from "@/actions/reference-data";
import { formatCnaeLine } from "@/lib/format-cnae";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AsyncComboboxOption = {
  value: string;
  label: string;
  description?: string;
  nbsCode?: string;
};

type ManualCreateConfig = {
  canCreate: (query: string, options: AsyncComboboxOption[]) => boolean;
  getCreateLabel: (query: string) => string;
  onCreate: (
    input: { code: string; description: string },
  ) => Promise<{ option: AsyncComboboxOption } | { error: string }>;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
};

type AsyncComboboxProps = {
  label: string;
  placeholder: string;
  value: string;
  displayValue?: string;
  onSelect: (option: AsyncComboboxOption) => void;
  searchAction: (query: string) => Promise<AsyncComboboxOption[]>;
  error?: string;
  manualCreate?: ManualCreateConfig;
  emptyMessage?: string;
};

function shouldSearch(query: string) {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 2) {
    return true;
  }

  return trimmed.length >= 2;
}

function extractDigits(query: string) {
  return query.replace(/\D/g, "");
}

function AsyncComboboxField({
  label,
  placeholder,
  value,
  displayValue,
  onSelect,
  searchAction,
  error,
  manualCreate,
  emptyMessage = "Nenhum resultado encontrado.",
}: AsyncComboboxProps) {
  const [query, setQuery] = useState(displayValue ?? "");
  const [options, setOptions] = useState<AsyncComboboxOption[]>([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDescription, setManualDescription] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();
  const searchActionRef = useRef(searchAction);

  useEffect(() => {
    searchActionRef.current = searchAction;
  }, [searchAction]);

  const trimmedQuery = query.trim();
  const skipSearch = Boolean(
    value && displayValue && trimmedQuery === displayValue.trim(),
  );
  const searchEnabled = shouldSearch(query) && !skipSearch;
  const visibleOptions = searchEnabled ? options : [];
  const visibleSearched = searchEnabled && searched;

  useEffect(() => {
    if (!searchEnabled) {
      return;
    }

    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const results = await searchActionRef.current(trimmedQuery);
        setOptions(results);
        setSearched(true);
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchEnabled, trimmedQuery]);

  const canManualCreate =
    manualCreate?.canCreate(trimmedQuery, visibleOptions) && visibleSearched && !pending;

  function resetManualCreate() {
    setManualOpen(false);
    setManualDescription("");
    setManualError(null);
  }

  function handleSelect(option: AsyncComboboxOption) {
    onSelect(option);
    setQuery(option.label);
    setOpen(false);
    resetManualCreate();
  }

  function handleStartManualCreate() {
    setManualOpen(true);
    setManualError(null);
    setOpen(true);
  }

  function handleConfirmManualCreate() {
    if (!manualCreate) {
      return;
    }

    const code = extractDigits(query);
    startCreate(async () => {
      setManualError(null);
      const result = await manualCreate.onCreate({
        code,
        description: manualDescription.trim(),
      });

      if ("error" in result) {
        setManualError(result.error);
        return;
      }

      handleSelect(result.option);
    });
  }

  const showDropdown =
    open && (visibleOptions.length > 0 || (visibleSearched && !pending) || manualOpen);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setOptions([]);
            setSearched(false);
            setOpen(true);
            resetManualCreate();
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false);
              resetManualCreate();
            }, 150);
          }}
        />
        {showDropdown ? (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
            {visibleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex w-full flex-col rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                  value === option.value && "bg-accent",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
              >
                <span className="font-medium">{option.label}</span>
                {option.description ? (
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                ) : null}
              </button>
            ))}

            {visibleSearched && !pending && visibleOptions.length === 0 && !manualOpen ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</p>
            ) : null}

            {canManualCreate && manualCreate && !manualOpen ? (
              <button
                type="button"
                className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm font-medium hover:bg-accent"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleStartManualCreate}
              >
                {manualCreate.getCreateLabel(trimmedQuery)}
              </button>
            ) : null}

            {manualOpen && manualCreate ? (
              <div className="space-y-2 border-t p-2">
                <div className="space-y-1">
                  <Label htmlFor={`${label}-manual-description`}>
                    {manualCreate.descriptionLabel ?? "Descrição do CNAE"}
                  </Label>
                  <Input
                    id={`${label}-manual-description`}
                    value={manualDescription}
                    placeholder={
                      manualCreate.descriptionPlaceholder ??
                      "Ex.: Reparação e manutenção de equipamentos elétricos"
                    }
                    onChange={(event) => setManualDescription(event.target.value)}
                    onMouseDown={(event) => event.stopPropagation()}
                  />
                </div>
                {manualError ? (
                  <p className="text-xs text-destructive">{manualError}</p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  disabled={creating || manualDescription.trim().length === 0}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleConfirmManualCreate}
                >
                  {creating ? "Cadastrando..." : "Confirmar cadastro"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {pending ? (
          <span className="absolute top-2.5 right-2 text-xs text-muted-foreground">...</span>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function AsyncCombobox(props: AsyncComboboxProps) {
  return (
    <AsyncComboboxField
      key={`${props.value}\0${props.displayValue ?? ""}`}
      {...props}
    />
  );
}

export async function searchMunicipalitiesCombobox(query: string): Promise<AsyncComboboxOption[]> {
  const rows = await searchMunicipalitiesAction({ q: query, limit: 20 });
  return rows.map((row) => ({
    value: row.ibgeCode,
    label: `${row.name}/${row.uf}`,
    description: `IBGE ${row.ibgeCode}`,
  }));
}

export async function searchCnaeCombobox(query: string): Promise<AsyncComboboxOption[]> {
  const rows = await searchCnaeCodesAction({ q: query, limit: 20 });
  return rows.map((row) => ({
    value: row.code,
    label: formatCnaeLine(row.code, row.description),
  }));
}

export async function searchNationalServiceCombobox(
  query: string,
): Promise<AsyncComboboxOption[]> {
  const rows = await searchNationalServiceCodesAction({ q: query, limit: 20 });
  return rows.map((item) => ({
    value: item.code,
    label: item.code,
    description: item.description,
    nbsCode: item.nbsCode ?? undefined,
  }));
}

const cnaeManualCreateConfig: ManualCreateConfig = {
  canCreate: (query, options) => {
    const digits = extractDigits(query);
    return digits.length === 7 && options.length === 0;
  },
  getCreateLabel: (query) => `Cadastrar CNAE ${extractDigits(query)}`,
  onCreate: async ({ code, description }) => {
    const result = await ensureCnaeCodeAction({ code, description });
    if (!result.success) {
      return { error: result.message };
    }

    return {
      option: {
        value: result.code,
        label: formatCnaeLine(result.code, result.description),
        description: result.description,
      },
    };
  },
};

type CnaeComboboxProps = Omit<
  AsyncComboboxProps,
  "searchAction" | "manualCreate" | "placeholder" | "emptyMessage"
> & {
  placeholder?: string;
  emptyMessage?: string;
};

export function CnaeCombobox({
  placeholder = "Código ou descrição (ex.: 6201 ou software)",
  emptyMessage = "Nenhum CNAE encontrado.",
  ...props
}: CnaeComboboxProps) {
  return (
    <AsyncCombobox
      {...props}
      placeholder={placeholder}
      emptyMessage={emptyMessage}
      searchAction={searchCnaeCombobox}
      manualCreate={cnaeManualCreateConfig}
    />
  );
}
