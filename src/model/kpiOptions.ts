import type { KpiStatus } from "./types";

export const KPI_STATUS: { key: KpiStatus; label: string }[] = [
  { key: "rascunho", label: "Rascunho" },
  { key: "em_validacao", label: "Em validação" },
  { key: "validado", label: "Validado pelo owner" },
  { key: "descontinuado", label: "Descontinuado" },
];

export const KPI_DIRECTIONS = [
  { key: "maior_melhor", label: "Quanto maior, melhor" },
  { key: "menor_melhor", label: "Quanto menor, melhor" },
  { key: "faixa", label: "Dentro de uma faixa" },
] as const;

/** Padrões que indicam um SEGREDO colado no lugar errado. Bloqueia o salvamento. */
const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-z0-9-]{16,}/i,
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\./,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(senha|password|passwd|pwd|secret|token)\s*[:=]\s*\S{4,}/i,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\b[a-f0-9]{32,}\b/i,
];

export function looksLikeSecret(...values: (string | null | undefined)[]): boolean {
  return values.some((v) => !!v && SECRET_PATTERNS.some((re) => re.test(v)));
}

/** Completude de metadados de um KPI (boas práticas de glossário). */
export const KPI_REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "definition", label: "Definição" },
  { key: "formula", label: "Fórmula" },
  { key: "owner", label: "Owner" },
  { key: "assumptions", label: "Premissas" },
  { key: "source_tables", label: "Tabelas / caminhos" },
  { key: "granularity", label: "Granularidade" },
  { key: "frequency", label: "Frequência" },
  { key: "unit", label: "Unidade" },
];

export function completeness(row: object, fields: { key: string }[]): number {
  const r = row as Record<string, unknown>;
  const filled = fields.filter((f) => {
    const v = r[f.key];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  return fields.length ? filled / fields.length : 1;
}
