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
import { buildAccountsReceivableListHref } from "@/lib/accounts-receivable-list-url";
import type { AccountReceivableListQuery } from "@/schemas/accounts-receivable";

type AccountsReceivableFiltersProps = {
  query: AccountReceivableListQuery;
};

export function AccountsReceivableFilters({ query }: AccountsReceivableFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(query.q);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmed = search.trim();

      if (trimmed === query.q) {
        return;
      }

      router.replace(
        buildAccountsReceivableListHref({
          ...query,
          q: trimmed,
          page: 1,
        }),
      );
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, query, router]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:flex-wrap">
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por contrato"
        className="md:max-w-md"
      />

      <Input
        type="month"
        value={query.competenceMonth ?? ""}
        onChange={(event) => {
          router.replace(
            buildAccountsReceivableListHref({
              ...query,
              competenceMonth: event.target.value || undefined,
              page: 1,
            }),
          );
        }}
        className="md:w-[180px]"
      />

      <Select
        value={query.status ?? "all"}
        onValueChange={(value) => {
          const status =
            value === "all"
              ? undefined
              : (value as AccountReceivableListQuery["status"]);

          router.replace(
            buildAccountsReceivableListHref({
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
          <SelectItem value="overdue">Vencido</SelectItem>
          <SelectItem value="paid">Pago</SelectItem>
          <SelectItem value="canceled">Cancelado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
