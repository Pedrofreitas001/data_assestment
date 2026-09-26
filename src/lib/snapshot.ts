// Resumo compacto da empresa ativa para dar contexto às skills de IA.
import { store } from "./store";
import { consistencyAlerts } from "../model/consistency";
import { scoreAssessment } from "../model/scoring";
import { CHECK_OPTIONS as CHECK_LABELS } from "../model/framework";
import { ASSET_REQUIRED_FIELDS, KPI_REQUIRED_FIELDS, completeness } from "../model/catalogOptions";
import type { Assessment, CredentialRecord, DataAsset, Kpi, Organization } from "../model/types";

export function assessmentDigest(a: Assessment) {
  const s = scoreAssessment(a);
  return {
    titulo: a.title,
    escopo: a.scope,
    status: a.status,
    nivel: s.band ? `${s.band.level} · ${s.band.label}` : null,
    nivel_calculado_sem_gates: s.computedBand ? `${s.computedBand.level} · ${s.computedBand.label}` : null,
    score_geral: s.overall !== null ? Math.round(s.overall) : null,
    indice_capacidades: s.capability !== null ? Math.round(s.capability) : null,
    indice_operacao: s.operation !== null ? Math.round(s.operation) : null,
    progresso: `${s.answered}/${s.total}`,
    confiabilidade: s.confidence.label,
    dimensoes: s.dims.map((d) => ({ dim: `${d.dim.code} ${d.dim.title}`, score: d.score === null ? null : Math.round(d.score) })),
    dominios: s.domains.map((d) => ({ dominio: d.domain.title, score: d.score === null ? null : Math.round(d.score) })),
    gates: s.gates.map((g) => g.reason),
    alertas: consistencyAlerts(a).map((x) => x.title),
    pontos_cegos: s.blindSpots.length,
  };
}

export function catalogDigest(assets: DataAsset[], creds: CredentialRecord[], kpis: Kpi[]) {
  return {
    ativos: assets.length,
    ativos_sem_owner: assets.filter((a) => !a.owner).length,
    ativos_lgpd: assets.filter((a) => a.sensitivity === "pessoal_lgpd").length,
    completude_media_ativos: assets.length ? Math.round((assets.reduce((s, a) => s + completeness(a, ASSET_REQUIRED_FIELDS), 0) / assets.length) * 100) : null,
    lista_ativos: assets.slice(0, 25).map((a) => `${a.name} [${a.asset_type}${a.system ? ", " + a.system : ""}${a.layer ? ", " + a.layer : ""}]`),
    credenciais: creds.length,
    credenciais_sem_controle: creds.filter((c) => c.status === "desconhecida" || !c.vault_location).length,
    kpis: kpis.length,
    kpis_validados: kpis.filter((k) => k.status === "validado").length,
    kpis_sem_owner: kpis.filter((k) => !k.owner).length,
    completude_media_kpis: kpis.length ? Math.round((kpis.reduce((s, k) => s + completeness(k, KPI_REQUIRED_FIELDS), 0) / kpis.length) * 100) : null,
    lista_kpis: kpis.slice(0, 25).map((k) => k.name),
  };
}

export async function orgSnapshot(org: Organization | null) {
  if (!org) return { empresa: null };
  const [assessments, assets, creds, kpis] = await Promise.all([
    store.list("assessments", { organization_id: org.id }),
    store.list("data_assets", { organization_id: org.id }),
    store.list("credentials", { organization_id: org.id }),
    store.list("kpis", { organization_id: org.id }),
  ]);
  const latest = assessments[0];
  return {
    empresa: { nome: org.name, segmento: org.segment, porte: org.size },
    assessment_mais_recente: latest ? assessmentDigest(latest) : null,
    contexto: latest?.context ?? null,
    catalogo_e_glossario: catalogDigest(assets, creds, kpis),
  };
}

/** Assessment completo, com o TEXTO das respostas, para as skills de interpretação. */
export function assessmentForLlm(a: Assessment) {
  const answers = a.answers || {};
  const label = (levels: { v: number; label: string }[], v: number | undefined) =>
    v === undefined ? null : v === 0 ? "Não sei" : levels.find((l) => l.v === v)?.label ?? String(v);
  const s = scoreAssessment(a);
  return {
    contexto: a.context,
    escopo: a.scope,
    respondente: a.respondent,
    resumo: assessmentDigest(a),
    capacidades: s.dims.map(({ dim, score }) => ({
      dimensao: `${dim.code} ${dim.title}`,
      score: score === null ? null : Math.round(score),
      respostas: dim.questions
        .filter((q) => answers[q.id] !== undefined)
        .map((q) => ({ id: q.id, pergunta: q.prompt, valor: answers[q.id], resposta: label(q.levels, answers[q.id]), max: q.levels.length, evidencia: a.evidence?.[q.id] || undefined })),
    })),
    dominios: s.domains.map(({ domain, score }) => ({
      dominio: domain.title,
      score: score === null ? null : Math.round(score),
      checagens: domain.checks
        .filter((c) => answers[c.id] !== undefined)
        .map((c) => ({ id: c.id, ponto: c.prompt, qualidade: c.quality, critico: !!c.critical, valor: answers[c.id], resposta: label(CHECK_LABELS, answers[c.id]), evidencia: a.evidence?.[c.id] || undefined })),
    })),
    qualidade_por_dimensao: s.quality.map((q) => ({ dimensao: q.label, score: q.score === null ? null : Math.round(q.score) })),
    gates: s.gates,
    rule_alerts: consistencyAlerts(a).map(({ title, detail, severity }) => ({ title, detail, severity })),
  };
}
