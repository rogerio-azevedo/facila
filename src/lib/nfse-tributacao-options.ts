export const ISSQN_CST_OPTIONS = [
  { value: "000", label: "000 — Tributado no município do prestador" },
  { value: "010", label: "010 — Tributado fora do município do prestador" },
  { value: "020", label: "020 — Isento" },
  { value: "030", label: "030 — Imune" },
  { value: "040", label: "040 — Não tributado" },
] as const;

export const IND_DEST_OPTIONS = [
  { value: "0", label: "0 — Tomador é o destinatário" },
  { value: "1", label: "1 — Tomador não é o destinatário" },
] as const;

export const FIN_NFSE_OPTIONS = [
  { value: "0", label: "0 — Regular" },
  { value: "1", label: "1 — Complementar" },
  { value: "2", label: "2 — Ajuste" },
] as const;

export const IND_FINAL_OPTIONS = [
  { value: "0", label: "0 — Não" },
  { value: "1", label: "1 — Consumidor final" },
] as const;

export const REG_AP_TRIB_SN_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "1", label: "1 — Federal e Municipal pelo SN" },
  { value: "2", label: "2 — Federal pelo SN, Municipal fora do SN" },
  { value: "3", label: "3 — Federal e Municipal fora do SN" },
] as const;

export const REG_ESP_TRIB_OPTIONS = [
  { value: "0", label: "0 — Sem regime especial" },
  { value: "1", label: "1 — Ato cooperado" },
  { value: "2", label: "2 — Estimativa" },
  { value: "3", label: "3 — Microempresa municipal" },
  { value: "4", label: "4 — Notário/registrador" },
  { value: "5", label: "5 — Profissional autônomo" },
  { value: "6", label: "6 — Sociedade de profissionais" },
] as const;
