import type { ServiceInvoiceListQuery } from "@/schemas/service-invoices";

export function buildServiceInvoicesListHref(params: ServiceInvoiceListQuery): string {
  const search = new URLSearchParams();

  if (params.q) {
    search.set("q", params.q);
  }

  if (params.status) {
    search.set("status", params.status);
  }

  if (params.environment) {
    search.set("environment", params.environment);
  }

  if (params.issuerId) {
    search.set("issuerId", params.issuerId);
  }

  if (params.page > 1) {
    search.set("page", String(params.page));
  }

  if (params.pageSize !== 10) {
    search.set("pageSize", String(params.pageSize));
  }

  const queryString = search.toString();
  return queryString ? `/service-invoices?${queryString}` : "/service-invoices";
}
