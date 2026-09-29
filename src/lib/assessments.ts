import { store, uid } from "./store";
import { scoreAssessment } from "../model/scoring";
import type { Assessment, Organization } from "../model/types";
import { FRAMEWORK_VERSION } from "../model/framework";

export async function createAssessment(org: Organization, createdBy?: string | null): Promise<Assessment> {
  const now = new Date();
  const row: Partial<Assessment> = {
    id: uid(),
    organization_id: org.id,
    title: `Diagnóstico ${now.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "")}`,
    scope: "Empresa toda",
    respondent: null,
    status: "rascunho",
    context: { segmento: org.segment || undefined, porte: org.size || undefined, versao: FRAMEWORK_VERSION },
    answers: {},
    evidence: {},
    ai_insights: null,
    report_notes: [],
    score: null,
    level: null,
    created_by: createdBy ?? null,
  };
  return store.upsert("assessments", row);
}

/** Salva recalculando score/nível desnormalizados (usados no painel da gestora). */
export async function saveAssessment(a: Assessment): Promise<Assessment> {
  const s = scoreAssessment(a);
  return store.upsert("assessments", {
    ...a,
    score: s.overall === null ? null : Math.round(s.overall * 100) / 100,
    level: s.band?.level ?? null,
  });
}
