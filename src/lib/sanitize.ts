// Normaliza respostas de LLM: modelos às vezes devolvem objeto onde se
// esperava texto, texto onde se esperava lista, null, números como string…
// Tudo o que vem da IA passa por aqui antes de chegar na tela ou no banco.
import type { AiInsights } from "../model/types";

export function str(x: unknown, fallback = ""): string {
  if (x === null || x === undefined) return fallback;
  if (typeof x === "string") return x;
  if (typeof x === "number" || typeof x === "boolean") return String(x);
  if (Array.isArray(x)) return x.map((i) => str(i)).filter(Boolean).join("\n");
  if (typeof x === "object") {
    const o = x as Record<string, unknown>;
    for (const k of ["text", "texto", "content", "reply", "message", "value", "title", "label"]) if (typeof o[k] === "string") return o[k] as string;
    return Object.values(o).map((v) => str(v)).filter(Boolean).join(" — ");
  }
  return fallback;
}

export function arr<T = unknown>(x: unknown): T[] {
  if (Array.isArray(x)) return x.filter((i) => i !== null && i !== undefined) as T[];
  if (x === null || x === undefined || x === "") return [];
  if (typeof x === "object") return Object.values(x as object) as T[];
  return [x as T];
}

export const strList = (x: unknown, max = 20) =>
  arr(x)
    .map((i) => str(i).trim())
    .filter(Boolean)
    .slice(0, max);

export function num(x: unknown): number | null {
  const n = typeof x === "number" ? x : typeof x === "string" ? Number(x.trim()) : NaN;
  return Number.isFinite(n) ? n : null;
}

const sev = (x: unknown): "alta" | "media" | "baixa" => {
  const s = str(x).toLowerCase();
  return s.startsWith("a") ? "alta" : s.startsWith("b") ? "baixa" : "media";
};
const conf = (x: unknown): "alta" | "media" | "baixa" => sev(x);

// ---------------------------------------------------------------- skills

/** Resposta às vezes vem com outro nome de campo ou com JSON dentro do texto. */
function pickReply(r: Record<string, unknown>): string {
  let reply = str(r.reply ?? r.resposta ?? r.answer ?? r.response ?? r.text ?? r.message ?? r.content);
  if (!reply) {
    const { follow_ups: _f, actions: _a, ...rest } = r;
    void _f;
    void _a;
    reply = str(rest);
  }
  const t = reply.trim();
  if (t.startsWith("{") && t.endsWith("}")) {
    try {
      const inner = JSON.parse(t) as Record<string, unknown>;
      const again = str(inner.reply ?? inner.resposta ?? inner.answer ?? inner.response);
      if (again) return again;
    } catch {
      /* texto normal */
    }
  }
  return reply;
}

export function normCopilot(o: unknown) {
  const r = (o && typeof o === "object" ? o : { reply: o }) as Record<string, unknown>;
  return {
    reply: pickReply(r) || "Não consegui formular uma resposta agora. Pode reformular?",
    follow_ups: strList(r.follow_ups, 3).map((f) => f.slice(0, 90)),
    actions: arr<Record<string, unknown>>(r.actions)
      .filter((a) => a && typeof a === "object")
      .map((a) => ({ type: str(a.type), label: str(a.label) || "Fazer isso" }))
      .filter((a) => a.type),
  };
}

export interface NormSuggestion {
  id: string;
  value: number;
  confidence: "alta" | "media" | "baixa";
  rationale: string;
  evidence_quote?: string;
}

export function normSuggestions(x: unknown): NormSuggestion[] {
  return arr<Record<string, unknown>>(x)
    .filter((s) => s && typeof s === "object")
    .map((s) => ({ id: str(s.id), value: num(s.value) ?? -1, confidence: conf(s.confidence), rationale: str(s.rationale), evidence_quote: str(s.evidence_quote) || undefined }))
    .filter((s) => s.id && s.value >= 0);
}

export function normInterview(o: unknown) {
  const r = (o && typeof o === "object" ? o : {}) as Record<string, unknown>;
  return {
    reply: str(r.reply ?? r.resposta ?? r.response),
    suggestions: normSuggestions(r.suggestions ?? r.sugestoes),
    next_question: str(r.next_question) || null,
    section_complete: r.section_complete === true || r.section_complete === "true",
  };
}

export function normInsights(o: unknown): Omit<AiInsights, "generated_at" | "model"> {
  const r = (o && typeof o === "object" ? o : {}) as Record<string, unknown>;
  return {
    headline: str(r.headline),
    executive_summary: str(r.executive_summary),
    strengths: strList(r.strengths),
    risks: arr<unknown>(r.risks).map((x) => {
      const i = (x && typeof x === "object" ? x : { title: x }) as Record<string, unknown>;
      return { title: str(i.title), detail: str(i.detail), severity: sev(i.severity) };
    }).filter((i) => i.title || i.detail),
    domain_insights: arr<unknown>(r.domain_insights).map((x) => {
      const i = (x && typeof x === "object" ? x : { insight: x }) as Record<string, unknown>;
      return { domain: str(i.domain), insight: str(i.insight), quick_win: str(i.quick_win) };
    }).filter((i) => i.domain || i.insight || i.quick_win),
    roadmap: arr<unknown>(r.roadmap).map((x) => {
      const i = (x && typeof x === "object" ? x : { actions: x }) as Record<string, unknown>;
      return { wave: str(i.wave), actions: strList(i.actions) };
    }),
    questions_for_next_meeting: strList(r.questions_for_next_meeting),
  };
}

/** Para dados já salvos (podem ter vindo de versões antigas ou malformados). */
export function safeInsights(x: unknown): AiInsights | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  return { ...normInsights(r), generated_at: str(r.generated_at) || new Date().toISOString(), model: str(r.model) || undefined };
}

export function normReview(o: unknown) {
  const r = (o && typeof o === "object" ? o : {}) as Record<string, unknown>;
  const v = str(r.verdict).toLowerCase();
  return {
    verdict: (v.startsWith("conf") ? "confiavel" : v.startsWith("inc") ? "inconsistente" : "revisar") as "confiavel" | "revisar" | "inconsistente",
    summary: str(r.summary),
    contradictions: arr<Record<string, unknown>>(r.contradictions).map((c) => ({ title: str(c?.title), detail: str(c?.detail), question_ids: strList(c?.question_ids), how_to_validate: str(c?.how_to_validate) })),
    blind_spots: arr<Record<string, unknown>>(r.blind_spots).map((b) => ({ topic: str(b?.topic), why_it_matters: str(b?.why_it_matters), question_to_ask: str(b?.question_to_ask) })),
    suggested_adjustments: arr<Record<string, unknown>>(r.suggested_adjustments)
      .map((a) => ({ id: str(a?.id), from: num(a?.from) ?? 0, to: num(a?.to) ?? -1, reason: str(a?.reason) }))
      .filter((a) => a.id && a.to >= 0),
  };
}

export function normKpiAi(o: unknown) {
  const r = (o && typeof o === "object" ? o : {}) as Record<string, unknown>;
  const k = (r.kpi && typeof r.kpi === "object" ? r.kpi : {}) as Record<string, unknown>;
  const kpi: Record<string, string> = {};
  for (const [key, val] of Object.entries(k)) {
    const s = str(val).trim();
    if (s) kpi[key] = s;
  }
  return {
    kpi,
    issues: arr<Record<string, unknown>>(r.issues).map((i) => ({ field: str(i?.field), severity: sev(i?.severity), message: str(i?.message) })).filter((i) => i.message),
    clarifying_questions: strList(r.clarifying_questions),
  };
}
