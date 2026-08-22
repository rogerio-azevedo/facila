import "server-only";

import {
  buildDueDateFromContract,
  isContractActiveInCompetenceMonth,
  parseCompetenceMonth,
} from "@/lib/billing";
import type { BatchBillingPreviewStatus } from "@/schemas/billing-runs";
import { listExistingByContractIdsAndCompetence } from "@/server/dal/accounts-receivable";
import { listClientsByIds } from "@/server/dal/clients";
import { listActiveContractsForBilling } from "@/server/dal/contracts";
import { ForbiddenError, requireCompanyContext } from "@/server/dal/context";
import { can } from "@/server/policies";

export type BatchBillingPreviewItem = {
  contractId: string;
  clientId: string;
  clientName: string;
  contractName: string;
  contractDescription: string | null;
  amount: string;
  dueDate: Date;
  status: BatchBillingPreviewStatus;
  existingAccountReceivableId?: string;
  skipReason?: string;
};

export type BatchBillingPreviewResult = {
  competenceDate: Date;
  items: BatchBillingPreviewItem[];
  readyCount: number;
  readyTotalAmount: number;
};

export async function getBatchBillingPreview(
  competenceMonth: string,
): Promise<BatchBillingPreviewResult> {
  const ctx = await requireCompanyContext();
  if (!can(ctx, "billing-runs:read")) {
    throw new ForbiddenError();
  }

  const competenceDate = parseCompetenceMonth(competenceMonth);
  const contracts = await listActiveContractsForBilling();
  const contractIds = contracts.map((contract) => contract.id);

  const existingRows = await listExistingByContractIdsAndCompetence(
    contractIds,
    competenceDate,
  );
  const existingByContractId = new Map(
    existingRows
      .filter((row) => row.contractId)
      .map((row) => [row.contractId!, row.id] as const),
  );

  const clientIds = [...new Set(contracts.map((contract) => contract.clientId))];
  const clients = await listClientsByIds(clientIds);
  const clientNameById = new Map(clients.map((client) => [client.id, client.name] as const));

  const items: BatchBillingPreviewItem[] = contracts.map((contract) => {
    const dueDate = buildDueDateFromContract(competenceDate, contract.dueDay);
    const existingId = existingByContractId.get(contract.id);

    if (existingId) {
      return {
        contractId: contract.id,
        clientId: contract.clientId,
        clientName: clientNameById.get(contract.clientId) ?? "-",
        contractName: contract.name,
        contractDescription: contract.description,
        amount: contract.amount,
        dueDate,
        status: "already_exists" as const,
        existingAccountReceivableId: existingId,
        skipReason: "Já existe título para esta competência",
      };
    }

    if (
      !isContractActiveInCompetenceMonth(
        contract.startDate,
        contract.endDate,
        competenceDate,
      )
    ) {
      return {
        contractId: contract.id,
        clientId: contract.clientId,
        clientName: clientNameById.get(contract.clientId) ?? "-",
        contractName: contract.name,
        contractDescription: contract.description,
        amount: contract.amount,
        dueDate,
        status: "out_of_term" as const,
        skipReason: "Contrato fora da vigência neste mês",
      };
    }

    return {
      contractId: contract.id,
      clientId: contract.clientId,
      clientName: clientNameById.get(contract.clientId) ?? "-",
      contractName: contract.name,
      contractDescription: contract.description,
      amount: contract.amount,
      dueDate,
      status: "ready" as const,
    };
  });

  const readyItems = items.filter((item) => item.status === "ready");
  const readyTotalAmount = readyItems.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  return {
    competenceDate,
    items,
    readyCount: readyItems.length,
    readyTotalAmount,
  };
}
