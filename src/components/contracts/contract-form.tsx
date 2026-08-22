"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createContractAction,
  deleteContractAction,
  updateContractAction,
} from "@/actions/contracts";
import { ContractFileField } from "@/components/contracts/contract-file-field";
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
import { uploadContractPdf } from "@/lib/contract-file-upload";
import type { ContractFormInitial } from "@/lib/contract-form-initial";
import {
  CONTRACT_STATUS_OPTIONS,
  READJUSTMENT_MONTH_OPTIONS,
  READJUSTMENT_OPTIONS,
  type ContractFormState,
} from "@/schemas/contracts";

type ClientOption = {
  id: string;
  name: string;
};

type ContractFormValues = ContractFormInitial;

type ContractFormProps = {
  mode: "create" | "edit";
  contractId?: string;
  clients: ClientOption[];
  initial?: Partial<ContractFormValues>;
  fileMeta?: {
    fileName: string | null;
    fileUploadedAt: Date | null;
  };
  initialUploadError?: string;
};

const defaultValues: ContractFormValues = {
  clientId: "",
  name: "",
  description: "",
  amount: "",
  startDate: "",
  endDate: "",
  termMonths: "",
  dueDay: "10",
  readjustmentIndex: "",
  readjustmentMonth: "",
  status: "active",
};

export function ContractForm({
  mode,
  contractId,
  clients,
  initial,
  fileMeta,
  initialUploadError,
}: ContractFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ContractFormValues>({
    ...defaultValues,
    ...initial,
  });
  const [state, setState] = useState<ContractFormState>({});
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(initialUploadError ?? null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const updateField = <K extends keyof ContractFormValues>(key: K, value: ContractFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      setUploadError(null);

      const payload = {
        clientId: values.clientId,
        name: values.name,
        description: values.description,
        amount: values.amount,
        startDate: values.startDate,
        endDate: values.endDate,
        termMonths: values.termMonths,
        dueDay: values.dueDay,
        readjustmentIndex: values.readjustmentIndex,
        readjustmentMonth: values.readjustmentMonth,
        status: values.status,
      };

      if (mode === "create") {
        const result = await createContractAction(payload);

        if (!result.success || !result.contractId) {
          setState(result);
          return;
        }

        if (pendingFile) {
          try {
            await uploadContractPdf(result.contractId, pendingFile);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Contrato criado, mas não foi possível anexar o PDF.";
            router.push(
              `/contracts/${result.contractId}?uploadError=${encodeURIComponent(message)}`,
            );
            return;
          }
        }

        router.push(`/contracts/${result.contractId}`);
        return;
      }

      const result = await updateContractAction(contractId!, payload);
      setState(result);
    });
  };

  const handleDelete = () => {
    if (!contractId || !window.confirm("Excluir este contrato permanentemente?")) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteContractAction(contractId);
      setState(result);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dados do contrato</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Cliente</Label>
            <Select
              value={values.clientId}
              onValueChange={(value) => updateField("clientId", value)}
              disabled={mode === "edit" && isPending}
            >
              <SelectTrigger id="clientId" className="w-full">
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
              <p className="text-sm text-destructive">{state.errors.clientId[0]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
            {state.errors?.name ? (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição na nota fiscal</Label>
            <textarea
              id="description"
              rows={3}
              value={values.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Ex.: Mensalidade de monitoramento e controle de acesso"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Texto que aparecerá na descrição do serviço ao emitir a NFS-e. Se ficar em branco,
              usaremos o nome do contrato.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor mensal (R$)</Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={values.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                required
              />
              {state.errors?.amount ? (
                <p className="text-sm text-destructive">{state.errors.amount[0]}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDay">Dia de vencimento</Label>
              <Input
                id="dueDay"
                type="number"
                min="1"
                max="31"
                value={values.dueDay}
                onChange={(event) => updateField("dueDay", event.target.value)}
                required
              />
              {state.errors?.dueDay ? (
                <p className="text-sm text-destructive">{state.errors.dueDay[0]}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Início da vigência</Label>
              <Input
                id="startDate"
                type="date"
                value={values.startDate}
                onChange={(event) => updateField("startDate", event.target.value)}
                required
              />
              {state.errors?.startDate ? (
                <p className="text-sm text-destructive">{state.errors.startDate[0]}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fim da vigência</Label>
              <Input
                id="endDate"
                type="date"
                value={values.endDate}
                onChange={(event) => updateField("endDate", event.target.value)}
              />
              {state.errors?.endDate ? (
                <p className="text-sm text-destructive">{state.errors.endDate[0]}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="termMonths">Prazo (meses)</Label>
              <Input
                id="termMonths"
                type="number"
                min="1"
                value={values.termMonths}
                onChange={(event) => updateField("termMonths", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="readjustmentMonth">Mês de reajuste</Label>
              <Select
                value={values.readjustmentMonth || "none"}
                onValueChange={(value) =>
                  updateField("readjustmentMonth", value === "none" ? "" : value)
                }
              >
                <SelectTrigger id="readjustmentMonth" className="w-full">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {READJUSTMENT_MONTH_OPTIONS.map((option) => (
                    <SelectItem key={option.value || "none"} value={option.value || "none"}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="readjustmentIndex">Índice de reajuste</Label>
              <Select
                value={values.readjustmentIndex || "none"}
                onValueChange={(value) =>
                  updateField("readjustmentIndex", value === "none" ? "" : value)
                }
              >
                <SelectTrigger id="readjustmentIndex" className="w-full">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {READJUSTMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value || "none"} value={option.value || "none"}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={values.status}
                onValueChange={(value) =>
                  updateField("status", value as ContractFormValues["status"])
                }
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contrato físico assinado (PDF)</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractFileField
            mode={mode}
            contractId={contractId}
            fileName={fileMeta?.fileName ?? null}
            fileUploadedAt={fileMeta?.fileUploadedAt ?? null}
            pendingFile={pendingFile}
            onPendingFileChange={setPendingFile}
            disabled={isPending || isDeleting}
          />
        </CardContent>
      </Card>

      {state.errors?.form ? (
        <p className="text-sm text-destructive">{state.errors.form[0]}</p>
      ) : null}

      {state.success ? (
        <p className="text-sm text-green-700">Contrato salvo com sucesso.</p>
      ) : null}

      {uploadError ? (
        <p className="text-sm text-destructive">{uploadError}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending || isDeleting}>
          {isPending ? "Salvando..." : mode === "create" ? "Criar contrato" : "Salvar alterações"}
        </Button>

        <Button variant="outline" asChild>
          <Link href="/contracts">Cancelar</Link>
        </Button>

        {mode === "edit" ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? "Excluindo..." : "Excluir contrato"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
