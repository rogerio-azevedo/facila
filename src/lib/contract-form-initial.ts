import { toDateInputValue } from "@/lib/format-currency";

export type ContractFormInitial = {
  clientId: string;
  name: string;
  description: string;
  amount: string;
  startDate: string;
  endDate: string;
  termMonths: string;
  dueDay: string;
  readjustmentIndex: string;
  readjustmentMonth: string;
  status: "active" | "inactive" | "suspended";
};

export function buildContractFormInitial(contract: {
  clientId: string;
  name: string;
  description: string | null;
  amount: string;
  startDate: Date;
  endDate: Date | null;
  termMonths: number | null;
  dueDay: number;
  readjustmentIndex: "IPCA" | "IGPM" | "INPC" | null;
  readjustmentMonth: number | null;
  status: "active" | "inactive" | "suspended";
}): ContractFormInitial {
  return {
    clientId: contract.clientId,
    name: contract.name,
    description: contract.description ?? "",
    amount: contract.amount,
    startDate: toDateInputValue(contract.startDate),
    endDate: toDateInputValue(contract.endDate),
    termMonths: contract.termMonths ? String(contract.termMonths) : "",
    dueDay: String(contract.dueDay),
    readjustmentIndex: contract.readjustmentIndex ?? "",
    readjustmentMonth: contract.readjustmentMonth ? String(contract.readjustmentMonth) : "",
    status: contract.status,
  };
}
