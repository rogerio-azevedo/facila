/** NFS-e XSD exige fone com 6-20 dígitos, sem "+" ou formatação. */
export function normalizeNfseFone(fone: string | null | undefined): string | undefined {
  const digits = fone?.replace(/\D/g, "");
  if (!digits) {
    return undefined;
  }

  if (digits.startsWith("55") && digits.length > 11) {
    return digits.slice(2);
  }

  return digits;
}

export function normalizeNfseCep(cep: string | null | undefined): string | undefined {
  const digits = cep?.replace(/\D/g, "");
  return digits && digits.length > 0 ? digits : undefined;
}

export function normalizeNfseDocument(
  document: string | null | undefined,
): string | undefined {
  const digits = document?.replace(/\D/g, "");
  return digits && digits.length > 0 ? digits : undefined;
}

const BR_OFFSET_MS = -180 * 60_000;

/** Partes de calendário no fuso de Brasília (para timestamps reais, ex. dhEmi). */
function toBrtDateParts(date: Date) {
  const brt = new Date(date.getTime() + BR_OFFSET_MS);

  return {
    year: brt.getUTCFullYear(),
    month: brt.getUTCMonth(),
    day: brt.getUTCDate(),
  };
}

/** Partes de calendário de colunas DATE do Postgres (ancoradas em UTC). */
function toUtcDateParts(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

/** Evita shift de -1 dia ao serializar TSData (open-nfse formata date-only em -03:00). */
export function normalizeNfseDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0),
  );
}

/**
 * Define dCompet para emissão: corrige timezone e, no mês corrente (BR),
 * usa a data de emissão em vez do 1º dia — evita rejeição quando a nota
 * é emitida dias/semanas após o início da competência (EM046/EM080).
 */
export function resolveEmissionCompetenceDate(
  competenceDate: Date,
  emissionDate: Date = new Date(),
): Date {
  const competence = toUtcDateParts(competenceDate);
  const emission = toBrtDateParts(emissionDate);

  if (emission.year === competence.year && emission.month === competence.month) {
    return new Date(
      Date.UTC(emission.year, emission.month, emission.day, 12, 0, 0, 0),
    );
  }

  if (
    emission.year > competence.year ||
    (emission.year === competence.year && emission.month > competence.month)
  ) {
    const lastDay = new Date(
      Date.UTC(competence.year, competence.month + 1, 0),
    ).getUTCDate();

    return new Date(
      Date.UTC(competence.year, competence.month, lastDay, 12, 0, 0, 0),
    );
  }

  return new Date(Date.UTC(competence.year, competence.month, 1, 12, 0, 0, 0));
}
