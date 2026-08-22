import type { ClientListQuery } from "@/schemas/clients";

export function buildClientsListHref(params: ClientListQuery): string {
  const search = new URLSearchParams();

  if (params.q) {
    search.set("q", params.q);
  }

  if (params.personType) {
    search.set("personType", params.personType);
  }

  if (params.onlyWithActiveContract === false) {
    search.set("onlyWithActiveContract", "false");
  }

  if (params.page > 1) {
    search.set("page", String(params.page));
  }

  if (params.pageSize !== 10) {
    search.set("pageSize", String(params.pageSize));
  }

  const queryString = search.toString();
  return queryString ? `/clients?${queryString}` : "/clients";
}
