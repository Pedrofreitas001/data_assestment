import {
  ALL_CHECKS,
  DIMENSIONS,
  DOMAINS,
  QUALITY_DIMS,
  UNKNOWN,
  bandForLevel,
  bandForScore,
  type Band,
  type Dimension,
  type OpDomain,
  type Question,
  type QualityDim,
} from "./framework";
import type { Assessment } from "./types";

type Answers = Record<string, number>;

const CAPABILITY_WEIGHT = 0.6;
const OPERATION_WEIGHT = 0.4;

export function isAnswered(v: number | undefined): v is number {
  return typeof v === "number";
}

export function questionScore(q: Question, v: number | undefined): number | null {
  if (!isAnswered(v)) return null;
  if (v === UNKNOWN) return 0;
  const max = q.levels.length;
  return max > 1 ? ((v - 1) / (max - 1)) * 100 : 100;
}

export function checkScore(v: number | undefined): number | null {
  if (!isAnswered(v)) return null;
  if (v === UNKNOWN) return 0;
  return ((v - 1) / 2) * 100;
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function dimensionScore(dim: Dimension, answers: Answers): number | null {
  const scores = dim.questions
    .map((q) => ({ s: questionScore(q, answers[q.id]), w: q.weight ?? 1 }))
    .filter((x): x is { s: number; w: number } => x.s !== null);
  if (!scores.length) return null;
  const tw = scores.reduce((a, x) => a + x.w, 0);
  return scores.reduce((a, x) => a + x.s * x.w, 0) / tw;
}

export function domainScore(domain: OpDomain, answers: Answers): number | null {
  return mean(
    domain.checks.map((c) => checkScore(answers[c.id])).filter((s): s is number => s !== null),
  );
}

export function scopedDomains(a: Pick<Assessment, "context">): OpDomain[] {
  const keys = a.context?.dominios;
  if (!keys || !keys.length) return DOMAINS;
  return DOMAINS.filter((d) => keys.includes(d.key));
}

export interface GateHit {
  questionId: string;
  prompt: string;
  capLevel: number;
  reason: string;
}

export interface ScoreResult {
  dims: { dim: Dimension; score: number | null }[];
  domains: { domain: OpDomain; score: number | null }[];
  quality: { key: QualityDim; label: string; score: number | null }[];
  matrix: Record<string, Partial<Record<QualityDim, number | null>>>;
  capability: number | null;
  operation: number | null;
  overall: number | null;
  computedBand: Band | null;
  band: Band | null;
  gates: GateHit[];
  blindSpots: string[];
  answered: number;
  total: number;
  progress: number;
  confidence: { pct: number; label: "Alta" | "Média" | "Baixa" };
}

export function scoreAssessment(a: Pick<Assessment, "answers" | "context" | "evidence">): ScoreResult {
  const answers = a.answers || {};
  const domains = scopedDomains(a);

  const dims = DIMENSIONS.map((dim) => ({ dim, score: dimensionScore(dim, answers) }));
  const doms = domains.map((domain) => ({ domain, score: domainScore(domain, answers) }));

  const dimScored = dims.filter((d) => d.score !== null) as { dim: Dimension; score: number }[];
  const capability = dimScored.length
    ? dimScored.reduce((acc, d) => acc + d.score * d.dim.weight, 0) / dimScored.reduce((acc, d) => acc + d.dim.weight, 0)
    : null;
  const operation = mean(doms.map((d) => d.score).filter((s): s is number => s !== null));

  let overall: number | null = null;
  if (capability !== null && operation !== null) overall = capability * CAPABILITY_WEIGHT + operation * OPERATION_WEIGHT;
  else overall = capability ?? operation;

  // Matriz domínio × dimensão de qualidade
  const matrix: ScoreResult["matrix"] = {};
  const qualityBuckets: Record<string, number[]> = {};
  for (const d of domains) {
    matrix[d.key] = {};
    for (const qd of QUALITY_DIMS) {
      const s = d.checks
        .filter((c) => c.quality === qd.key)
        .map((c) => checkScore(answers[c.id]))
        .filter((x): x is number => x !== null);
      matrix[d.key][qd.key] = mean(s);
      (qualityBuckets[qd.key] ||= []).push(...s);
    }
  }
  const quality = QUALITY_DIMS.map((qd) => ({ key: qd.key, label: qd.label, score: mean(qualityBuckets[qd.key] || []) }));

  // Gates: não se pula etapa (lógica DCAM)
  const gates: GateHit[] = [];
  for (const dim of DIMENSIONS)
    for (const q of dim.questions) {
      const v = answers[q.id];
      if (q.gate && isAnswered(v) && v <= q.gate.belowOrEqual)
        gates.push({ questionId: q.id, prompt: q.prompt, capLevel: q.gate.capLevel, reason: q.gate.reason });
    }

  const computedBand = bandForScore(overall);
  let band = computedBand;
  if (band && gates.length) {
    const cap = Math.min(...gates.map((g) => g.capLevel));
    if (band.level > cap) band = bandForLevel(cap);
  }

  // Cobertura e confiabilidade
  const ids = [...DIMENSIONS.flatMap((d) => d.questions.map((q) => q.id)), ...domains.flatMap((d) => d.checks.map((c) => c.id))];
  const answeredIds = ids.filter((id) => isAnswered(answers[id]));
  const blindSpots = answeredIds.filter((id) => answers[id] === UNKNOWN);
  const known = answeredIds.length - blindSpots.length;
  const withEvidence = answeredIds.filter((id) => (a.evidence?.[id] || "").trim().length > 3).length;
  const confPct = answeredIds.length ? Math.round((known / ids.length) * 85 + (withEvidence / ids.length) * 15) : 0;
  const confLabel = confPct >= 75 ? "Alta" : confPct >= 50 ? "Média" : "Baixa";

  return {
    dims,
    domains: doms,
    quality,
    matrix,
    capability,
    operation,
    overall,
    computedBand,
    band,
    gates,
    blindSpots,
    answered: answeredIds.length,
    total: ids.length,
    progress: ids.length ? answeredIds.length / ids.length : 0,
    confidence: { pct: confPct, label: confLabel },
  };
}

export function tierFor(pct: number | null): "critico" | "atencao" | "maduro" | null {
  if (pct === null) return null;
  if (pct < 40) return "critico";
  if (pct < 67) return "atencao";
  return "maduro";
}

export const TIER_LABEL = { critico: "Crítico", atencao: "Em desenvolvimento", maduro: "Maduro" } as const;

export function fmtPct(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export { ALL_CHECKS };
