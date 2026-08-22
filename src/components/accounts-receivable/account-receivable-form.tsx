"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  createAccountReceivableAction,
  updateAccountReceivableAction,
} from "@/actions/accounts-receivable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildDueDateFromContract, formatCompetenceMonth } from "@/lib/billing";
import { toDateInputValue } from "@/lib/format-currency";
import type { AccountReceivableFormState } from "@/schemas/accounts-receivable";

type ClientOption = {
  id: string;
  name: string;
};

type ContractOption = {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  amount: string;
  dueDay: number;
};

type AccountReceivableFormValues = {
  clientId: string;
  contractId: string;
  description: string;
  amount: string;
  competenceMonth: string;
  issueDate: string;
  dueDate: string;
  notes: string;
};

type AccountReceivableFormProps = {
  mode: "create" | "edit";
  accountReceivableId?: string;
  clients: ClientOption[];
  contracts: ContractOption[];
  initial?: Partial<AccountReceivableFormValues>;
  readOnly?: boolean;
};

const defaultValues: AccountReceivableFormValues = {
  clientId: "",
  contractId: "",
  description: "",
  amount: "",
  competenceMonth: formatCompetenceMonth(new Date()),
  issueDate: toDateInputValue(new Date()),
  dueDate: "",
  notes: "",
};

export function AccountReceivableForm({
  mode,
  accountReceivableId,
  clients,
  contracts,
  initial,
  readOnly = false,
}: AccountReceivableFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<AccountReceivableFormValues>({
    ...defaultValues,
    ...initial,
  });
  const [state, setState] = useState<AccountReceivableFormState>({});
  const [isPending, startTransition] = useTransition();

  const clientContracts = contracts.filter(
    (contract) => contract.clientId === values.clientId,
  );

  useEffect(() => {
    if (!values.contractId || mode === "edit") {
      return;
    }

    const contract = contracts.find((item) => item.id === values.contractId);
    if (!contract) {
      return;
    }

    const competenceDate = values.competenceMonth
      ? new Date(`${values.competenceMonth}-01T00:00:00.000Z`)
      : new Date();
    const dueDate = buildDueDateFromContract(competenceDate, contract.dueDay);

    setValues((current) => ({
      ...current,
      description: contract.description ?? contract.name,
      amount: contract.amount,
      dueDate: toDateInputValue(dueDate),
    }));
  }, [values.contractId, values.competenceMonth, contracts, mode]);

  const updateField = <K extends keyof AccountReceivableFormValues>(
    key: K,
    value: AccountReceivableFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const payload = {
        clientId: values.clientId,
        contractId: values.contractId,
        description: values.description,
        amount: values.amount,
        competenceDate: `${values.competenceMonth}-01`,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        notes: values.notes,
      };

      if (mode === "create") {
        const result = await createAccountReceivableAction(payload);

        if (!result.success || !result.accountReceivableId) {
          setState(result);
          return;
        }

        router.push(`/accounts-receivable/${result.accountReceivableId}`);
        router.refresh();
        return;
      }

      if (!accountReceivableId) {
        return;
      }

      const result = await updateAccountReceivableAction(accountReceivableId, {
        description: values.description,
        amount: values.amount,
        dueDate: values.dueDate,
        notes: values.notes,
      });

      if (!result.success) {
        setState(result);
        return;
      }

      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Nova conta a receber" : "Editar conta a receber"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {state.errors?.form ? (
            <p className="text-sm text-destructive">{state.errors.form.join(", ")}</p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientId">Cliente</Label>
              <Select
                value={values.clientId}
                onValueChange={(value) => {
                  updateField("clientId", value);
                  updateField("contractId", "");
                }}
                disabled={readOnly || mode === "edit"}
              >
                <SelectTrigger id="clientId">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.clientId ? (
                <p className="text-sm text-destructive">{state.errors.clientId.join(", ")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractId">Contrato (opcional)</Label>
              <Select
                value={values.contractId || "none"}
                onValueChange={(value) =>
                  updateField("contractId", value === "none" ? "" : value)
                }
                disabled={readOnly || mode === "edit" || !values.clientId}
              >
                <SelectTrigger id="contractId">
                  <SelectValue placeholder="Avulso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Avulso</SelectItem>
                  {clientContracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={values.description}
                onChange={(event) => updateField("description", event.target.value)}
                disabled={readOnly}
              />
              {state.errors?.description ? (
                <p className="text-sm text-destructive">
                  {state.errors.description.join(", ")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={values.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                disabled={readOnly}
              />
              {state.errors?.amount ? (
                <p className="text-sm text-destructive">{state.errors.amount.join(", ")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="competenceMonth">Competência</Label>
              <Input
                id="competenceMonth"
                type="month"
                value={values.competenceMonth}
                onChange={(event) => updateField("competenceMonth", event.target.value)}
                disabled={readOnly || mode === "edit"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issueDate">Emissão</Label>
              <Input
                id="issueDate"
                type="date"
                value={values.issueDate}
                onChange={(event) => updateField("issueDate", event.target.value)}
                disabled={readOnly || mode === "edit"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Vencimento</Label>
              <Input
                id="dueDate"
                type="date"
                value={values.dueDate}
                onChange={(event) => updateField("dueDate", event.target.value)}
                disabled={readOnly}
              />
              {state.errors?.dueDate ? (
                <p className="text-sm text-destructive">{state.errors.dueDate.join(", ")}</p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                value={values.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>

          {!readOnly ? (
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/accounts-receivable">Cancelar</Link>
              </Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
