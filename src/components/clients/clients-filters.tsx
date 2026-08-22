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
import { buildClientsListHref } from "@/lib/clients-list-url";
import type { ClientListQuery } from "@/schemas/clients";

type ClientsFiltersProps = {
  query: ClientListQuery;
};

export function ClientsFilters({ query }: ClientsFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(query.q);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmed = search.trim();

      if (trimmed === query.q) {
        return;
      }

      router.replace(
        buildClientsListHref({
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
        placeholder="Buscar por nome ou documento"
        className="md:max-w-md"
      />

      <Select
        value={query.personType ?? "all"}
        onValueChange={(value) => {
          const personType =
            value === "all" ? undefined : (value as "individual" | "organization");

          router.replace(
            buildClientsListHref({
              ...query,
              personType,
              page: 1,
            }),
          );
        }}
      >
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          <SelectItem value="individual">Pessoa física</SelectItem>
          <SelectItem value="organization">Pessoa jurídica</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
