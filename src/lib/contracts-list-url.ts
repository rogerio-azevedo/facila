import type { ContractListQuery } from "@/schemas/contracts";

export function buildContractsListHref(params: ContractListQuery): string {
  const search = new URLSearchParams();

  if (params.q) {
    search.set("q", params.q);
  }

  if (params.status) {
    search.set("status", params.status);
  }

  if (params.clientId) {
    search.set("clientId", params.clientId);
  }

  if (params.page > 1) {
    search.set("page", String(params.page));
  }

  if (params.pageSize !== 10) {
    search.set("pageSize", String(params.pageSize));
  }

  const queryString = search.toString();
  return queryString ? `/contracts?${queryString}` : "/contracts";
}
