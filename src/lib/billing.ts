/** Normaliza uma data para o 1º dia do mês (UTC). */
export function normalizeCompetenceDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Converte "YYYY-MM" ou Date para competência (1º dia do mês). */
export function parseCompetenceMonth(value: string | Date): Date {
  if (value instanceof Date) {
    return normalizeCompetenceDate(value);
  }

  const [yearPart, monthPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart) - 1;

  if (!year || Number.isNaN(month) || month < 0 || month > 11) {
    throw new Error("invalid-competence-month");
  }

  return new Date(Date.UTC(year, month, 1));
}

export function formatCompetenceMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Label legível da competência, ex.: "agosto de 2026". */
export function formatCompetenceLabel(value: string | Date): string {
  const date = typeof value === "string" ? parseCompetenceMonth(value) : normalizeCompetenceDate(value);

  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Calcula vencimento a partir do dia do contrato no mês da competência. */
export function buildDueDateFromContract(competenceDate: Date, dueDay: number): Date {
  const year = competenceDate.getUTCFullYear();
  const month = competenceDate.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(dueDay, lastDay);

  return new Date(Date.UTC(year, month, day));
}

/** Verifica se o contrato está vigente no mês de competência. */
export function isContractActiveInCompetenceMonth(
  startDate: Date,
  endDate: Date | null,
  competenceDate: Date,
): boolean {
  const year = competenceDate.getUTCFullYear();
  const month = competenceDate.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0));

  const contractStart = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()),
  );

  if (contractStart > monthEnd) {
    return false;
  }

  if (endDate) {
    const contractEnd = new Date(
      Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()),
    );

    if (contractEnd < monthStart) {
      return false;
    }
  }

  return true;
}

/** Título derivado: pending com vencimento passado. */
export function isOverdue(
  status: "pending" | "paid" | "canceled",
  dueDate: Date,
  referenceDate = new Date(),
): boolean {
  if (status !== "pending") {
    return false;
  }

  const due = new Date(
    Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()),
  );
  const today = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
    ),
  );

  return due < today;
}

export function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
