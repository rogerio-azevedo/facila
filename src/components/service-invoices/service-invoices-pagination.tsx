"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildServiceInvoicesListHref } from "@/lib/service-invoices-list-url";
import type { ServiceInvoiceListQuery } from "@/schemas/service-invoices";

type ServiceInvoicesPaginationProps = {
  query: ServiceInvoiceListQuery;
  total: number;
};

export function ServiceInvoicesPagination({ query, total }: ServiceInvoicesPaginationProps) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const currentPage = Math.min(query.page, totalPages);
  const canPrevious = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-end gap-6 px-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium whitespace-nowrap">Linhas por página</p>
        <Select
          value={String(query.pageSize)}
          onValueChange={(value) => {
            router.replace(
              buildServiceInvoicesListHref({
                ...query,
                pageSize: Number(value) as ServiceInvoiceListQuery["pageSize"],
                page: 1,
              }),
            );
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 50].map((pageSize) => (
              <SelectItem key={pageSize} value={String(pageSize)}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-[100px] items-center justify-center text-sm font-medium">
        Página {currentPage} de {totalPages}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          className="hidden lg:inline-flex"
          disabled={!canPrevious}
          asChild={canPrevious}
        >
          {canPrevious ? (
            <Link
              href={buildServiceInvoicesListHref({ ...query, page: 1 })}
              aria-label="Ir para a primeira página"
            >
              <ChevronFirstIcon />
            </Link>
          ) : (
            <span aria-hidden="true">
              <ChevronFirstIcon />
            </span>
          )}
        </Button>

        <Button variant="outline" size="icon-sm" disabled={!canPrevious} asChild={canPrevious}>
          {canPrevious ? (
            <Link
              href={buildServiceInvoicesListHref({ ...query, page: currentPage - 1 })}
              aria-label="Ir para a página anterior"
            >
              <ChevronLeftIcon />
            </Link>
          ) : (
            <span aria-hidden="true">
              <ChevronLeftIcon />
            </span>
          )}
        </Button>

        <Button variant="outline" size="icon-sm" disabled={!canNext} asChild={canNext}>
          {canNext ? (
            <Link
              href={buildServiceInvoicesListHref({ ...query, page: currentPage + 1 })}
              aria-label="Ir para a próxima página"
            >
              <ChevronRightIcon />
            </Link>
          ) : (
            <span aria-hidden="true">
              <ChevronRightIcon />
            </span>
          )}
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          className="hidden lg:inline-flex"
          disabled={!canNext}
          asChild={canNext}
        >
          {canNext ? (
            <Link
              href={buildServiceInvoicesListHref({ ...query, page: totalPages })}
              aria-label="Ir para a última página"
            >
              <ChevronLastIcon />
            </Link>
          ) : (
            <span aria-hidden="true">
              <ChevronLastIcon />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
