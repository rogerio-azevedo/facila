import type { AccountReceivableTableRow } from "@/components/accounts-receivable/accounts-receivable-table";

export function canEmitNfseByStatus(
  status: AccountReceivableTableRow["status"],
  nfseStatus: AccountReceivableTableRow["nfseStatus"],
) {
  return (
    status === "pending" &&
    (nfseStatus === "none" ||
      nfseStatus === "rejected" ||
      nfseStatus === "canceled" ||
      nfseStatus === "error")
  );
}

export function canEmitNfseForAccountReceivable(row: AccountReceivableTableRow) {
  return canEmitNfseByStatus(row.status, row.nfseStatus);
}

export function getAccountReceivableRowLabel(row: AccountReceivableTableRow) {
  const contractLabel = row.contractName ?? (row.contractId ? "Contrato removido" : "Avulso");
  const clientLabel = row.clientName ?? "Cliente";

  return `${clientLabel} · ${contractLabel}`;
}
