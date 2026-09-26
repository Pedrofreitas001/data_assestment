import type { AssessmentContext } from "./framework";

export type Role = "admin" | "consultor" | "cliente";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  organization_id: string | null;
  created_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  segment: string | null;
  size: string | null;
  city: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: "ativo" | "pausado" | "encerrado";
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export type AssessmentStatus = "rascunho" | "em_revisao" | "concluido";

export interface AiInsights {
  generated_at: string;
  model?: string;
  headline: string;
  executive_summary: string;
  strengths: string[];
  risks: { title: string; detail: string; severity: "alta" | "media" | "baixa" }[];
  domain_insights: { domain: string; insight: string; quick_win: string }[];
  roadmap: { wave: string; actions: string[] }[];
  questions_for_next_meeting: string[];
}

export interface Assessment {
  id: string;
  organization_id: string;
  title: string;
  scope: string | null;
  respondent: string | null;
  status: AssessmentStatus;
  context: AssessmentContext;
  answers: Record<string, number>;
  evidence: Record<string, string>;
  ai_insights: AiInsights | null;
  score: number | null;
  level: number | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type AssetType = "sistema" | "banco" | "api" | "planilha" | "pipeline" | "relatorio" | "arquivo";
export type Sensitivity = "publico_interno" | "restrito" | "confidencial" | "pessoal_lgpd";
export type Layer = "origem" | "bronze" | "prata" | "ouro";

export interface DataAsset {
  id: string;
  organization_id: string;
  name: string;
  asset_type: AssetType;
  system: string | null;
  domain: string | null;
  description: string | null;
  location: string | null;
  owner: string | null;
  steward: string | null;
  access_method: string | null;
  refresh_frequency: string | null;
  layer: Layer | null;
  sensitivity: Sensitivity | null;
  pipeline_level: number | null;
  quality_status: "nao_avaliado" | "critico" | "atencao" | "confiavel" | null;
  upstream: string[];
  tags: string[];
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CredentialStatus = "ativa" | "expirada" | "desconhecida" | "revogar" | "pendente";

/** Registro de credencial — NUNCA armazena o segredo, só a governança dele. */
export interface CredentialRecord {
  id: string;
  organization_id: string;
  asset_id: string | null;
  name: string;
  credential_type: string | null;
  holder: string | null;
  vault_location: string | null;
  status: CredentialStatus;
  expires_at: string | null;
  last_verified_at: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export type KpiStatus = "rascunho" | "em_validacao" | "validado" | "descontinuado";

export interface Kpi {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  domain: string | null;
  definition: string | null;
  business_question: string | null;
  formula: string | null;
  numerator: string | null;
  denominator: string | null;
  unit: string | null;
  granularity: string | null;
  frequency: string | null;
  direction: "maior_melhor" | "menor_melhor" | "faixa" | null;
  target: string | null;
  owner: string | null;
  steward: string | null;
  assumptions: string | null;
  exclusions: string | null;
  source_tables: string | null;
  lineage: string | null;
  asset_ids: string[];
  quality_checks: string | null;
  consumers: string | null;
  status: KpiStatus;
  version: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export type TableName = "organizations" | "assessments" | "data_assets" | "credentials" | "kpis" | "profiles";

export interface TableRow {
  organizations: Organization;
  assessments: Assessment;
  data_assets: DataAsset;
  credentials: CredentialRecord;
  kpis: Kpi;
  profiles: Profile;
}
