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
import { buildContractsListHref } from "@/lib/contracts-list-url";
import type { ContractListQuery } from "@/schemas/contracts";

type ContractsFiltersProps = {
  query: ContractListQuery;
};

export function ContractsFilters({ query }: ContractsFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(query.q);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmed = search.trim();

      if (trimmed === query.q) {
        return;
      }

      router.replace(
        buildContractsListHref({
          ...query,
          q: trimmed,
          page: 1,
        }),
      );
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, query, router]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nome ou descrição"
        className="md:max-w-md"
      />

      <Select
        value={query.status ?? "all"}
        onValueChange={(value) => {
          const status =
            value === "all" ? undefined : (value as ContractListQuery["status"]);

          router.replace(
            buildContractsListHref({
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
          <SelectItem value="active">Ativo</SelectItem>
          <SelectItem value="inactive">Inativo</SelectItem>
          <SelectItem value="suspended">Suspenso</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
