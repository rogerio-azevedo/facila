const digitsOnly = (value: string) => value.replace(/\D/g, "");

export function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(cnpj[i]) * weights1[i]!;
  let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (check !== Number(cnpj[12])) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(cnpj[i]) * weights2[i]!;
  check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return check === Number(cnpj[13]);
}

export function normalizeCnpj(value: string): string {
  return digitsOnly(value);
}

export { digitsOnly };
