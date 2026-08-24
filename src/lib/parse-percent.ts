/**
 * Converte percentuais informados como número ou string (pt-BR ou en-US).
 * Retorna `undefined` para vazio ou inválido.
 */
export function parsePercent(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const raw = String(value).trim();
  if (!raw) {
    return undefined;
  }

  const normalized = raw.replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}
