"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildServiceInvoicesListHref } from "@/lib/service-invoices-list-url";
import type { ServiceInvoiceListQuery } from "@/schemas/service-invoices";

type IssuerOption = {
  id: string;
  legalName: string;
};

type ServiceInvoicesFiltersProps = {
  query: ServiceInvoiceListQuery;
  issuers: IssuerOption[];
};

export function ServiceInvoicesFilters({ query, issuers }: ServiceInvoicesFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(query.q);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmed = search.trim();

      if (trimmed === query.q) {
        return;
      }

      router.replace(
        buildServiceInvoicesListHref({
          ...query,
          q: trimmed,
          page: 1,
        }),
      );
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, query, router]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:flex-wrap md:items-center">
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por cliente"
        className="md:max-w-md"
      />

      <Select
        value={query.status ?? "all"}
        onValueChange={(value) => {
          const status =
            value === "all" ? undefined : (value as ServiceInvoiceListQuery["status"]);

          router.replace(
            buildServiceInvoicesListHref({
              ...query,
              status,
              page: 1,
            }),
          );
        }}
      >
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="pending">Pendente</SelectItem>
          <SelectItem value="authorized">Autorizada</SelectItem>
          <SelectItem value="rejected">Rejeitada</SelectItem>
          <SelectItem value="canceled">Cancelada</SelectItem>
          <SelectItem value="error">Erro</SelectItem>
          <SelectItem value="pending_retry">Aguardando retry</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={query.environment ?? "all"}
        onValueChange={(value) => {
          const environment =
            value === "all" ? undefined : (value as ServiceInvoiceListQuery["environment"]);

          router.replace(
            buildServiceInvoicesListHref({
              ...query,
              environment,
              page: 1,
            }),
          );
        }}
      >
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Ambiente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os ambientes</SelectItem>
          <SelectItem value="homologacao">Homologação</SelectItem>
          <SelectItem value="producao">Produção</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={query.issuerId ?? "all"}
        onValueChange={(value) => {
          const issuerId = value === "all" ? undefined : value;

          router.replace(
            buildServiceInvoicesListHref({
              ...query,
              issuerId,
              page: 1,
            }),
          );
        }}
      >
        <SelectTrigger className="w-full md:w-[220px]">
          <SelectValue placeholder="Emissor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os emissores</SelectItem>
          {issuers.map((issuer) => (
            <SelectItem key={issuer.id} value={issuer.id}>
              {issuer.legalName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
