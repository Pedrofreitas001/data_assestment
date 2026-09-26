import type { AssetType, CredentialStatus, KpiStatus, Layer, Sensitivity } from "./types";

export const ASSET_TYPES: { key: AssetType; label: string; hint: string }[] = [
  { key: "sistema", label: "Sistema", hint: "ERP, WMS, TMS, plataforma de e-commerce" },
  { key: "banco", label: "Banco de dados", hint: "PostgreSQL, SQL Server, data warehouse" },
  { key: "api", label: "API / Integração", hint: "Endpoint, webhook, conector" },
  { key: "planilha", label: "Planilha", hint: "Excel, Google Sheets" },
  { key: "pipeline", label: "Pipeline / Script", hint: "Python, Power Query, n8n, Airflow" },
  { key: "relatorio", label: "Relatório / BI", hint: "Painel Power BI, Looker, relatório do ERP" },
  { key: "arquivo", label: "Arquivo / Export", hint: "CSV, XML de NF, EDI" },
];

export const LAYERS: { key: Layer; label: string; hint: string }[] = [
  { key: "origem", label: "Origem", hint: "Sistema transacional ou planilha operacional" },
  { key: "bronze", label: "Bronze", hint: "Cópia bruta, sem transformação" },
  { key: "prata", label: "Prata", hint: "Limpo, deduplicado, com chave comum (DIM)" },
  { key: "ouro", label: "Ouro", hint: "Modelo de negócio pronto para KPI/BI" },
];

export const SENSITIVITY: { key: Sensitivity; label: string; hint: string }[] = [
  { key: "publico_interno", label: "Público interno", hint: "Pode circular entre colaboradores" },
  { key: "restrito", label: "Restrito", hint: "Comercial/estratégico — acesso por área" },
  { key: "confidencial", label: "Confidencial", hint: "Negociações, custos, salários" },
  { key: "pessoal_lgpd", label: "Pessoal (LGPD)", hint: "CPF, endereço, telefone, e-mail de pessoa física" },
];

export const PIPELINE_LEVELS = [
  { v: 1, label: "N1 · Exploratório", hint: "Script/planilha pontual para validar premissas" },
  { v: 2, label: "N2 · Rotina com owner", hint: "Processo periódico com responsável formal" },
  { v: 3, label: "N3 · Camada ouro", hint: "Consolidado em banco alimentando BI" },
  { v: 4, label: "N4 · Automação", hint: "Backend/webapp automatizado e monitorado" },
  { v: 5, label: "N5 · Agentic", hint: "Linguagem natural sobre a camada ouro" },
];

export const QUALITY_STATUS = [
  { key: "nao_avaliado", label: "Não avaliado" },
  { key: "critico", label: "Crítico" },
  { key: "atencao", label: "Atenção" },
  { key: "confiavel", label: "Confiável" },
] as const;

export const FREQUENCIES = ["Tempo real", "Horária", "Diária", "Semanal", "Mensal", "Sob demanda", "Manual / irregular"];
export const ACCESS_METHODS = ["API REST", "Conexão direta ao banco", "Export manual (CSV/Excel)", "Relatório do sistema", "EDI / arquivo", "Conector nativo (BI)", "Webhook", "Não há acesso"];

export const CREDENTIAL_TYPES = ["Usuário e senha", "API key / token", "OAuth (client id/secret)", "Certificado digital", "Chave SSH", "Conta de serviço", "Acesso via fornecedor"];

export const CREDENTIAL_STATUS: { key: CredentialStatus; label: string }[] = [
  { key: "ativa", label: "Ativa e validada" },
  { key: "pendente", label: "Pendente de obter" },
  { key: "desconhecida", label: "Ninguém sabe" },
  { key: "expirada", label: "Expirada" },
  { key: "revogar", label: "A revogar" },
];

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

export const ASSET_REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "owner", label: "Owner" },
  { key: "steward", label: "Steward" },
  { key: "location", label: "Localização" },
  { key: "access_method", label: "Acesso" },
  { key: "sensitivity", label: "Sensibilidade" },
  { key: "refresh_frequency", label: "Atualização" },
];

export function completeness(row: object, fields: { key: string }[]): number {
  const r = row as Record<string, unknown>;
  const filled = fields.filter((f) => {
    const v = r[f.key];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  return fields.length ? filled / fields.length : 1;
}
