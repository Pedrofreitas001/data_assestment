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
  quality_checks: string | null;
  consumers: string | null;
  status: KpiStatus;
  version: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export type TableName = "organizations" | "assessments" | "kpis" | "profiles";

export interface TableRow {
  organizations: Organization;
  assessments: Assessment;
  kpis: Kpi;
  profiles: Profile;
}
