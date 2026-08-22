export function formatCurrency(value: string | number): string {
  const amount = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(amount)) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("pt-BR");
}

export function formatDateRange(start: Date | string, end: Date | string | null): string {
  const startLabel = formatDate(start);

  if (!end) {
    return startLabel;
  }

  return `${startLabel} — ${formatDate(end)}`;
}

export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}
