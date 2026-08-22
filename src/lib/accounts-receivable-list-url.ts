import type { AccountReceivableListQuery } from "@/schemas/accounts-receivable";

export function buildAccountsReceivableListHref(
  params: AccountReceivableListQuery,
): string {
  const search = new URLSearchParams();

  if (params.q) {
    search.set("q", params.q);
  }

  if (params.clientId) {
    search.set("clientId", params.clientId);
  }

  if (params.status) {
    search.set("status", params.status);
  }

  if (params.competenceMonth) {
    search.set("competenceMonth", params.competenceMonth);
  }

  if (params.page > 1) {
    search.set("page", String(params.page));
  }

  if (params.pageSize !== 10) {
    search.set("pageSize", String(params.pageSize));
  }

  const queryString = search.toString();
  return queryString ? `/accounts-receivable?${queryString}` : "/accounts-receivable";
}
