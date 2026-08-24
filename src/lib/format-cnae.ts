export function formatCnaeCode(code: string): string {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 7) {
    return code;
  }

  return `${digits[0]}.${digits.slice(1, 3)}.${digits.slice(3, 5)}-${digits.slice(5, 7)}`;
}

export function formatCnaeDescription(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) {
    return "";
  }

  const lower = trimmed.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

export function stripCnaeCodePrefix(code: string, text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  const formattedCode = formatCnaeCode(code);
  const digits = code.replace(/\D/g, "");
  const prefixes = [formattedCode, digits].filter((prefix) => prefix.length > 0);
  const lowerText = trimmed.toLocaleLowerCase("pt-BR");

  for (const prefix of prefixes) {
    if (lowerText.startsWith(prefix.toLocaleLowerCase("pt-BR"))) {
      return trimmed.slice(prefix.length).trim();
    }
  }

  return trimmed;
}

export function formatCnaeLine(code: string, description: string): string {
  const formattedCode = formatCnaeCode(code);
  const formattedDescription = formatCnaeDescription(stripCnaeCodePrefix(code, description));
  if (!formattedDescription) {
    return formattedCode;
  }

  return `${formattedCode} ${formattedDescription}`;
}
