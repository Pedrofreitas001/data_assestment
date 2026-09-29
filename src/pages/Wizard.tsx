import { friendlyError } from "../lib/errors";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CircleHelp, FileBarChart, Lock, MessageSquareText, Sparkles, TriangleAlert } from "lucide-react";
import { store } from "../lib/store";
import { saveAssessment } from "../lib/assessments";
import { callSkill } from "../lib/llm";
import { assessmentForLlm } from "../lib/snapshot";
import { useToast } from "../context/toast";
import { useOrg } from "../context/org";
import { useCopilot, type AnswerSuggestion, type InterviewSection } from "../context/copilot";
import { normReview } from "../lib/sanitize";
import {
  CHECK_OPTIONS,
  DIMENSIONS,
  DOMAINS,
  GOALS,
  NOT_APPLICABLE,
  QUALITY_DIMS,
  SECTOR_LABEL,
  SEGMENTS,
  SIZE_BANDS,
  SYSTEM_SUGGESTIONS,
  TEAM_OPTIONS,
  UNKNOWN,
  answerLabel,
  exampleFor,
  sectorOf,
  suggestedDomainKeys,
  type AssessmentContext,
  type LevelOption,
} from "../model/framework";
import { isAnswered, scopedDomains, scoreAssessment } from "../model/scoring";
import { consistencyAlerts } from "../model/consistency";
import type { Assessment } from "../model/types";
import { AiMark, BandScale, Bar, Empty, Field, LoadingPage, Metrics, Spinner } from "../components/ui";
import { ScoreRing } from "../components/charts";

// ---------------------------------------------------------------------
type Item = { id: string; prompt: string; help?: string; example?: string; na?: string; levels: LevelOption[]; tags: string[]; inline?: boolean };
type Section =
  | { key: "contexto"; group: string; title: string; kind: "context" }
  | { key: string; group: string; title: string; code?: string; desc: string; kind: "questions"; items: Item[]; refs?: string }
  | { key: "revisao"; group: string; title: string; kind: "review" };

interface Suggestion {
  id: string;
  value: number;
  confidence: "alta" | "media" | "baixa";
  rationale: string;
  evidence_quote?: string;
}
interface ReviewOutput {
  verdict: "confiavel" | "revisar" | "inconsistente";
  summary: string;
  contradictions: { title: string; detail: string; question_ids: string[]; how_to_validate: string }[];
  blind_spots: { topic: string; why_it_matters: string; question_to_ask: string }[];
  suggested_adjustments: { id: string; from: number; to: number; reason: string }[];
}

const QUALITY_LABEL = Object.fromEntries(QUALITY_DIMS.map((q) => [q.key, q.label]));

function buildSections(a: Assessment): Section[] {
  const seg = a.context?.segmento;
  const dims: Section[] = DIMENSIONS.map((d) => ({
    key: d.key,
    group: "Capacidades",
    title: d.title,
    code: d.code,
    desc: d.description,
    refs: d.refs,
    kind: "questions",
    items: d.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      help: q.help,
      example: exampleFor(q.examples, seg),
      na: q.na,
      levels: q.levels,
      tags: [...(q.gate ? ["Fundamental"] : []), ...(q.perception ? ["Percepção"] : [])],
    })),
  }));
  const doms: Section[] = scopedDomains(a).map((d) => ({
    key: d.key,
    group: "Qualidade por área",
    title: d.title,
    desc: `${d.description} Fontes típicas: ${d.typicalSources.join(", ")}.`,
    kind: "questions",
    items: d.checks.map((c) => ({
      id: c.id,
      prompt: c.prompt,
      help: c.help,
      example: exampleFor(c.examples, seg),
      na: "Não se aplica",
      levels: CHECK_OPTIONS,
      tags: [QUALITY_LABEL[c.quality], ...(c.critical ? ["Crítico"] : [])],
      inline: true,
    })),
  }));
  return [
    { key: "contexto", group: "Início", title: "Contexto da empresa", kind: "context" },
    ...dims,
    ...doms,
    { key: "revisao", group: "Fechamento", title: "Revisão e conclusão", kind: "review" },
  ];
}

// ---------------------------------------------------------------------
export default function Wizard() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { org } = useOrg();
  const [a, setA] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<Assessment | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    store.get("assessments", id!).then((row) => {
      setA(row);
      setLoading(false);
    });
  }, [id]);

  const flush = useCallback(async () => {
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    setSaveState("saving");
    try {
      await saveAssessment(next);
      setSaveState("saved");
    } catch (e) {
      setSaveState("error");
      toast(friendlyError(e, "Erro ao salvar"), "err");
    }
  }, [toast]);

  useEffect(() => () => void flush(), [flush]);

  const aRef = useRef<Assessment | null>(null);
  aRef.current = a;
  const update = useCallback(
    (fn: (x: Assessment) => Assessment) => {
      const prev = aRef.current;
      if (!prev) return;
      const next = fn(prev);
      aRef.current = next;
      setA(next);
      pending.current = next;
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 700);
      setSaveState("saving");
    },
    [flush],
  );

  const sections = useMemo(() => (a ? buildSections(a) : []), [a]);
  const score = useMemo(() => (a ? scoreAssessment(a) : null), [a]);

  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const go = useCallback((i: number) => {
    setStep(Math.max(0, Math.min(sectionsRef.current.length - 1, i)));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // ---------------------------------------------------------- assistente
  const copilot = useCopilot();
  const stepRef = useRef(step);
  stepRef.current = step;

  const toInterview = (s: Section): InterviewSection | null =>
    s.kind === "questions" ? { key: s.key, title: s.title, desc: s.desc, questions: s.items.map((q) => ({ id: q.id, prompt: q.prompt, options: q.levels })) } : null;

  const startInterviewFor = useCallback(
    (s: Section) => {
      const iv = toInterview(s);
      if (!iv) return;
      copilot.startInterview(
        iv,
        () => Object.fromEntries(iv.questions.filter((q) => isAnswered(aRef.current?.answers[q.id])).map((q) => [q.id, aRef.current!.answers[q.id]])),
        aRef.current?.context,
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [copilot.startInterview],
  );

  useEffect(() => {
    const applyOne = (x: Assessment, sg: AnswerSuggestion): Assessment => {
      const evidence = { ...x.evidence };
      if (sg.evidence_quote && !(evidence[sg.id] || "").trim()) evidence[sg.id] = `Relato: "${sg.evidence_quote}"`;
      return { ...x, answers: { ...x.answers, [sg.id]: sg.value }, evidence };
    };
    return copilot.registerHandlers({
      apply_answers: (items) => {
        const list = items as AnswerSuggestion[];
        update((x) => list.reduce(applyOne, x));
        setSuggestions((prev) => {
          const n = { ...prev };
          list.forEach((i) => delete n[i.id]);
          return n;
        });
      },
      preview_answers: (items) => {
        const list = (items as AnswerSuggestion[]).filter((i) => i.value > 0);
        setSuggestions((prev) => ({ ...prev, ...Object.fromEntries(list.map((i) => [i.id, { id: i.id, value: i.value, confidence: i.confidence || "media", rationale: i.rationale || "", evidence_quote: i.evidence_quote }])) }));
      },
      start_interview: () => {
        const all = sectionsRef.current;
        const cur = all[stepRef.current];
        if (cur?.kind === "questions") return startInterviewFor(cur);
        const answers = aRef.current?.answers || {};
        let idx = all.findIndex((x) => x.kind === "questions" && x.items.some((q) => !isAnswered(answers[q.id])));
        if (idx < 0) idx = all.findIndex((x) => x.kind === "questions");
        if (idx < 0) return;
        go(idx);
        startInterviewFor(all[idx]);
      },
      next_section: () => {
        const nextIdx = Math.min(sectionsRef.current.length - 1, stepRef.current + 1);
        go(nextIdx);
        const next = sectionsRef.current[nextIdx];
        if (next.kind === "questions") startInterviewFor(next);
        else copilot.stopInterview();
      },
      review_consistency: () => go(sectionsRef.current.length - 1),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copilot.registerHandlers, update, startInterviewFor]);

  // Foco: o que o usuário está vendo agora.
  useEffect(() => {
    if (!a) return;
    const cur = sections[step];
    copilot.setFocus({
      tela: "Diagnóstico — preenchimento",
      assessment_id: a.id,
      secao_atual: cur ? cur.title : null,
      descricao_secao: cur && cur.kind === "questions" ? cur.desc : null,
      perguntas_da_secao:
        cur && cur.kind === "questions"
          ? cur.items.map((q) => ({ pergunta: q.prompt, opcoes: q.levels.map((l) => `${l.v}: ${l.label}`), resposta_atual: a.answers[q.id] === undefined ? null : a.answers[q.id] <= 0 ? answerLabel(q.levels, a.answers[q.id], q.na) : a.answers[q.id] }))
          : null,
      progresso: `${Math.round((scoreAssessment(a).progress || 0) * 100)}%`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, step, sections]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => copilot.setFocus(null), []);

  // Chamadas proativas: ao entrar numa seção vazia e quando o usuário para.
  const lastActivity = useRef(Date.now());
  useEffect(() => {
    lastActivity.current = Date.now();
  }, [a?.answers]);
  useEffect(() => {
    const cur = sections[step];
    if (!cur || !a) return;
    if (cur.kind === "questions") {
      const answered = cur.items.filter((q) => isAnswered(a.answers[q.id])).length;
      if (answered === 0 && !copilot.interview)
        copilot.nudge({
          id: `enter-${cur.key}`,
          text: `Quer responder **${cur.title}** conversando? Eu marco as opções para você.`,
          actions: [{ type: "start_interview", label: "Responder conversando" }],
          followUps: ["Me explique esta seção"],
        });
      const t = setInterval(() => {
        const idle = Date.now() - lastActivity.current > 75_000;
        const left = cur.items.filter((q) => !isAnswered(aRef.current?.answers[q.id])).length;
        if (idle && left > 0 && !copilot.interview)
          copilot.nudge({
            id: `idle-${cur.key}`,
            text: "Dúvida em alguma pergunta? Posso explicar ou preencher conversando.",
            actions: [{ type: "start_interview", label: "Responder conversando" }],
            followUps: ["Qual a diferença entre as opções?"],
          });
      }, 15_000);
      return () => clearInterval(t);
    }
    if (cur.kind === "review")
      copilot.nudge({
        id: `review-${a.id}`,
        text: "Antes de concluir, posso revisar contradições e pontos cegos.",
        actions: [{ type: "run_review", label: "Revisar agora" }],
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, sections.length]);

  // Seção concluída → oferece leitura da nota.
  const doneSeen = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!a || !score) return;
    const cur = sections[step];
    if (!cur || cur.kind !== "questions") return;
    const complete = cur.items.every((q) => isAnswered(a.answers[q.id]));
    if (!complete) {
      doneSeen.current.add(`open-${cur.key}`);
      return;
    }
    if (!doneSeen.current.has(`open-${cur.key}`) || doneSeen.current.has(cur.key)) return;
    doneSeen.current.add(cur.key);
    const dimScore = score.dims.find((d) => d.dim.key === cur.key)?.score ?? score.domains.find((d) => d.domain.key === cur.key)?.score ?? null;
    copilot.nudge({
      id: `done-${a.id}-${cur.key}`,
      urgent: true,
      text: `Seção **${cur.title}** concluída${dimScore !== null ? ` — nota **${Math.round(dimScore)}**` : ""}. Quer entender o que significa?`,
      actions: [
        { type: "ask", label: "O que significa?", payload: `Concluí a seção ${cur.title}${dimScore !== null ? ` com nota ${Math.round(dimScore)}` : ""}. O que isso significa para a empresa e qual o primeiro passo para melhorar?` },
        { type: "next_section", label: "Próxima seção" },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.answers, step]);

  if (loading) return <LoadingPage />;
  if (!a || !score) return <Empty title="Diagnóstico não encontrado" action={<Link className="btn" to="/assessments">Voltar</Link>} />;

  const sec = sections[Math.min(step, sections.length - 1)];
  const setAnswer = (qid: string, v: number | undefined) =>
    update((x) => {
      const answers = { ...x.answers };
      if (v === undefined) delete answers[qid];
      else answers[qid] = v;
      return { ...x, answers };
    });
  const setEvidence = (qid: string, text: string) => update((x) => ({ ...x, evidence: { ...x.evidence, [qid]: text } }));
  const setCtx = (patch: Partial<AssessmentContext>) => update((x) => ({ ...x, context: { ...x.context, ...patch } }));

  const sectionProgress = (s: Section) => {
    if (s.kind === "context") {
      const c = a.context || {};
      const req = [c.segmento, c.porte, c.time_dados, c.objetivo];
      return req.filter(Boolean).length / req.length;
    }
    if (s.kind === "review") return a.status === "concluido" ? 1 : 0;
    return s.items.filter((q) => isAnswered(a.answers[q.id])).length / s.items.length;
  };

  let lastGroup = "";
  return (
    <div ref={topRef} style={{ scrollMarginTop: 24 }}>
      <div className="row-between wrap" style={{ marginBottom: 22 }}>
        <div className="row" style={{ gap: 12 }}>
          <Link to="/assessments" className="btn btn-ghost btn-sm btn-icon" aria-label="Voltar">
            <ArrowLeft size={17} />
          </Link>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>
              {org?.name} · Diagnóstico
            </p>
            <input
              className="serif wiz-title"
              value={a.title}
              onChange={(e) => update((x) => ({ ...x, title: e.target.value }))}
              aria-label="Título do diagnóstico"
              style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", border: "none", background: "transparent", padding: 0, outline: "none", width: "min(520px, 70vw)" }}
            />
          </div>
        </div>
        <div className="row">
          <span className="save-state">
            {saveState === "saving" && (
              <>
                <Spinner /> Salvando…
              </>
            )}
            {saveState === "saved" && (
              <>
                <Check size={14} /> Salvo
              </>
            )}
            {saveState === "error" && <span style={{ color: "var(--risk)" }}>Erro ao salvar</span>}
          </span>
          <button
            className="btn btn-sm"
            onClick={async () => {
              clearTimeout(timer.current);
              await flush();
              nav(`/assessments/${a.id}/resultado`);
            }}
          >
            <FileBarChart size={15} /> Relatório
          </button>
        </div>
      </div>

      <div className="wizard">
        {/* Stepper */}
        <nav className="stepper" aria-label="Seções do diagnóstico">
          {sections.map((s, i) => {
            const p = sectionProgress(s);
            const header = s.group !== lastGroup ? <div className="stepper-group">{s.group}</div> : null;
            lastGroup = s.group;
            const answered = s.kind === "questions" ? s.items.filter((q) => isAnswered(a.answers[q.id])).length : null;
            return (
              <div key={s.key}>
                {header}
                <button className={`step ${i === step ? "on" : ""}`} onClick={() => go(i)}>
                  <span className={`step-dot ${p >= 1 ? "done" : p > 0 ? "partial" : ""}`} style={{ ["--p" as string]: `${p * 360}deg` }}>
                    {p >= 1 ? <Check size={11} /> : null}
                  </span>
                  <span className="t">{s.title}</span>
                  {s.kind === "questions" && (
                    <span className="s">
                      {answered}/{s.items.length}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Conteúdo */}
        <section style={{ minWidth: 0 }}>
          <select className="select step-select" value={step} onChange={(e) => go(Number(e.target.value))} aria-label="Seção">
            {sections.map((s, i) => (
              <option key={s.key} value={i}>
                {i + 1}. {s.kind === "questions" && s.code ? `${s.code} · ${s.title}` : s.title} {Math.round(sectionProgress(s) * 100)}%
              </option>
            ))}
          </select>
          {sec.kind === "context" && <ContextStep a={a} setCtx={setCtx} update={update} />}
          {sec.kind === "questions" && (
            <QuestionsStep
              key={sec.key}
              section={sec}
              a={a}
              setAnswer={setAnswer}
              setEvidence={setEvidence}
              suggestions={suggestions}
              setSuggestions={setSuggestions}
              onInterview={() => startInterviewFor(sec)}
              onExplain={(q) =>
                copilot.ask(
                  `Explique esta pergunta em linguagem simples: "${q.prompt}". O que ela quer saber, o que diferencia cada opção (${q.levels.map((l) => `${l.v}: ${l.label}`).join("; ")}) e como descubro a resposta certa na minha empresa?`,
                  `Explique: “${q.prompt}”`,
                )
              }
              onUnknown={(q) =>
                copilot.nudge({
                  id: `unknown-${q.id}`,
                  urgent: true,
                  text: "Tudo bem — vira **ponto a investigar**. Quer saber a quem perguntar?",
                  actions: [{ type: "ask", label: "Como descubro isso?", payload: `Como descubro a resposta para: "${q.prompt}"? A quem devo perguntar na empresa e que evidência pedir?` }],
                })
              }
            />
          )}
          {sec.kind === "review" && (
            <ReviewStep
              a={a}
              sections={sections}
              goTo={(qid) => {
                const i = sections.findIndex((s) => s.kind === "questions" && s.items.some((q) => q.id === qid));
                if (i >= 0) go(i);
              }}
              setAnswer={setAnswer}
              finish={async (status) => {
                const next = { ...a, status };
                setA(next);
                pending.current = null;
                clearTimeout(timer.current);
                await saveAssessment(next);
                toast(status === "concluido" ? "Diagnóstico concluído" : "Status atualizado");
                if (status === "concluido") nav(`/assessments/${a.id}/resultado`);
              }}
            />
          )}

          <div className="wizard-nav">
            <button className="btn" onClick={() => go(step - 1)} disabled={step === 0}>
              <ArrowLeft size={16} /> Anterior
            </button>
            <span className="xs muted num">
              {step + 1} / {sections.length}
            </span>
            {step < sections.length - 1 ? (
              <button className="btn btn-primary" onClick={() => go(step + 1)}>
                Próxima <ArrowRight size={16} />
              </button>
            ) : (
              <span />
            )}
          </div>
        </section>

        {/* Trilho com score ao vivo */}
        <aside className="wizard-rail stack" style={{ position: "sticky", top: 24 }}>
          <div className="card card-pad" style={{ textAlign: "center" }}>
            <p className="section-title" style={{ textAlign: "left" }}>
              Resultado parcial
            </p>
            <ScoreRing value={score.overall} size={132} label={score.band ? score.band.label.toUpperCase() : "SCORE"} />
            <div style={{ marginTop: 14, textAlign: "left" }}>
              <BandScale band={score.band} computed={score.computedBand} />
            </div>
            <hr className="divider" />
            <div className="stack" style={{ gap: 10, textAlign: "left" }}>
              <div className="row-between small">
                <span className="muted">Respondido</span>
                <span className="num">
                  {score.answered}/{score.total}
                </span>
              </div>
              <Bar value={score.progress * 100} thin brand />
              <div className="row-between small">
                <span className="muted">Confiabilidade</span>
                <span>{score.confidence.label}</span>
              </div>
              <div className="row-between small">
                <span className="muted">Pontos cegos</span>
                <span className="num">{score.blindSpots.length}</span>
              </div>
              {score.gates.length > 0 && (
                <div className="callout" style={{ fontSize: 12 }}>
                  <div className="callout-title">
                    <Lock size={13} /> Teto atual: nível {Math.min(...score.gates.map((g) => g.capLevel))}
                  </div>
                  <span className="muted">
                    {score.gates.length} requisito(s) fundacional(is) pendente(s) — o nível não passa disso enquanto não forem resolvidos.
                  </span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function ContextStep({ a, setCtx, update }: { a: Assessment; setCtx: (p: Partial<AssessmentContext>) => void; update: (fn: (x: Assessment) => Assessment) => void }) {
  const c = a.context || {};
  const [custom, setCustom] = useState("");
  const systems = c.sistemas || [];
  const toggleSys = (s: string) => setCtx({ sistemas: systems.includes(s) ? systems.filter((x) => x !== s) : [...systems, s] });
  // Sem escolha explícita valem as áreas sugeridas (núcleo + módulos do setor).
  const suggested = suggestedDomainKeys(c.segmento);
  const domains = c.dominios && c.dominios.length ? c.dominios : suggested;
  const toggleDom = (k: string) => setCtx({ dominios: domains.includes(k) ? domains.filter((x) => x !== k) : [...domains, k] });
  const sector = sectorOf(c.segmento);
  const segOptions = c.segmento && !(SEGMENTS as readonly string[]).includes(c.segmento) ? [c.segmento, ...SEGMENTS] : [...SEGMENTS];

  const domainButton = (d: (typeof DOMAINS)[number]) => {
    const on = domains.includes(d.key);
    const sug = !d.core && d.sectors?.includes(sector);
    return (
      <button key={d.key} type="button" className={`opt ${on ? "on" : ""}`} onClick={() => toggleDom(d.key)} style={{ alignItems: "flex-start" }}>
        <span className="lv">{on ? <Check size={12} /> : ""}</span>
        <span>
          <b style={{ fontWeight: 600, color: "inherit" }}>{d.title}</b>
          {sug && (
            <span className="badge badge-brand" style={{ marginLeft: 6 }}>
              Sugerido para {SECTOR_LABEL[sector]}
            </span>
          )}
          <span className="xs" style={{ display: "block", opacity: 0.75 }}>
            {d.description}
          </span>
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="section-hero">
        <span className="code">Etapa inicial</span>
        <h2>Contexto da empresa</h2>
        <p>Algumas informações rápidas. Elas ajustam os exemplos das perguntas, as áreas avaliadas e o tamanho do plano de ação.</p>
      </div>
      <div className="card card-pad">
        <div className="form-section">
          <h4>Identificação</h4>
          <div className="form-grid">
            <Field label="Escopo do diagnóstico">
              <input className="input" value={a.scope || ""} onChange={(e) => update((x) => ({ ...x, scope: e.target.value }))} />
            </Field>
            <Field label="Quem está respondendo">
              <input className="input" value={a.respondent || ""} onChange={(e) => update((x) => ({ ...x, respondent: e.target.value }))} placeholder="Ex.: Marina (Dir. Comercial) + Tiago (BI)" />
            </Field>
            <Field label="Segmento">
              <select className="select" value={c.segmento || ""} onChange={(e) => setCtx({ segmento: e.target.value })}>
                <option value="">Selecione…</option>
                {segOptions.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Porte">
              <select className="select" value={c.porte || ""} onChange={(e) => setCtx({ porte: e.target.value })}>
                <option value="">Selecione…</option>
                {SIZE_BANDS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Unidades ou locais de operação (opcional)" full>
              <input className="input" value={c.unidades || c.lojas_cds || ""} onChange={(e) => setCtx({ unidades: e.target.value })} placeholder="Ex.: 3 filiais e 1 fábrica · 12 lojas e 1 CD · escritório único" />
            </Field>
          </div>
        </div>
        <div className="form-section">
          <h4>Quem cuida dos dados hoje?</h4>
          <p className="small muted" style={{ marginTop: -4 }}>
            Define o tamanho realista do plano: quantos passos cabem nos primeiros 30 dias.
          </p>
          <div className="ctx-choices">
            {TEAM_OPTIONS.map((t) => {
              const on = c.time_dados === t.key;
              return (
                <button key={t.key} type="button" className={`opt ${on ? "on" : ""}`} onClick={() => setCtx({ time_dados: on ? undefined : t.key })} style={{ alignItems: "flex-start" }}>
                  <span className="lv">{on ? <Check size={12} /> : ""}</span>
                  <span>
                    <b style={{ fontWeight: 600, color: "inherit" }}>{t.label}</b>
                    {"hint" in t && t.hint && (
                      <span className="xs" style={{ display: "block", opacity: 0.75 }}>
                        {t.hint}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="form-section">
          <h4>Objetivo principal com dados nos próximos 6 meses</h4>
          <p className="small muted" style={{ marginTop: -4 }}>
            Os passos que atacam este objetivo sobem na prioridade do plano.
          </p>
          <div className="ctx-choices">
            {GOALS.map((g) => {
              const on = c.objetivo === g.key;
              return (
                <button key={g.key} type="button" className={`opt ${on ? "on" : ""}`} onClick={() => setCtx({ objetivo: on ? undefined : g.key })} style={{ alignItems: "flex-start" }}>
                  <span className="lv">{on ? <Check size={12} /> : ""}</span>
                  <span>
                    <b style={{ fontWeight: 600, color: "inherit" }}>{g.label}</b>
                    {g.hint && (
                      <span className="xs" style={{ display: "block", opacity: 0.75 }}>
                        {g.hint}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="form-section">
          <h4>Sistemas em uso</h4>
          <div className="chips">
            {[...new Set([...SYSTEM_SUGGESTIONS, ...systems])].map((s) => (
              <button key={s} type="button" className={`chip ${systems.includes(s) ? "on" : ""}`} onClick={() => toggleSys(s)}>
                {s}
              </button>
            ))}
          </div>
          <form
            className="row"
            style={{ marginTop: 10, maxWidth: 360 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (custom.trim()) toggleSys(custom.trim());
              setCustom("");
            }}
          >
            <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Outro sistema…" />
            <button className="btn btn-sm">Adicionar</button>
          </form>
        </div>
        <div className="form-section">
          <h4>Principais dificuldades</h4>
          <div className="form-grid">
            <Field label="O que mais incomoda hoje nos dados da empresa?" full>
              <textarea className="textarea" value={c.dores || ""} onChange={(e) => setCtx({ dores: e.target.value })} placeholder="Ex.: os números não batem entre sistemas; o relatório leva dias para sair; só uma pessoa sabe montar o fechamento…" />
            </Field>
          </div>
        </div>
        <div className="form-section">
          <h4>Áreas avaliadas</h4>
          <p className="small muted" style={{ marginTop: -4 }}>
            Cada área adiciona 4 a 6 perguntas objetivas. As do núcleo valem para qualquer empresa; os módulos dependem do setor.
          </p>
          <div className="dom-group-title">Núcleo — toda empresa</div>
          <div className="grid g-2" style={{ gap: 8 }}>
            {DOMAINS.filter((d) => d.core).map(domainButton)}
          </div>
          <div className="dom-group-title">Módulos por setor</div>
          <div className="grid g-2" style={{ gap: 8 }}>
            {DOMAINS.filter((d) => !d.core).map(domainButton)}
          </div>
          {!c.dominios?.length && <p className="xs muted" style={{ marginTop: 8 }}>Pré-selecionamos o núcleo e os módulos do seu setor. Ajuste se quiser.</p>}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
function QuestionsStep({
  section,
  a,
  setAnswer,
  setEvidence,
  suggestions,
  setSuggestions,
  onInterview,
  onExplain,
  onUnknown,
}: {
  onInterview: () => void;
  onExplain: (q: Item) => void;
  onUnknown: (q: Item) => void;
  section: Extract<Section, { kind: "questions" }>;
  a: Assessment;
  setAnswer: (id: string, v: number | undefined) => void;
  setEvidence: (id: string, t: string) => void;
  suggestions: Record<string, Suggestion>;
  setSuggestions: (fn: (s: Record<string, Suggestion>) => Record<string, Suggestion>) => void;
}) {
  const [openEvidence, setOpenEvidence] = useState<Record<string, boolean>>({});
  const pendingSugs = section.items.filter((q) => suggestions[q.id] && a.answers[q.id] !== suggestions[q.id].value);
  void setSuggestions;

  function apply(s: Suggestion) {
    setAnswer(s.id, s.value);
    if (s.evidence_quote && !(a.evidence?.[s.id] || "").trim()) setEvidence(s.id, `Relato: "${s.evidence_quote}"`);
  }

  return (
    <>
      <div className="section-hero">
        <span className="code">{section.code ? `Capacidade ${section.code.slice(1)} de ${DIMENSIONS.length}` : "Qualidade dos dados · área avaliada"}</span>
        <h2>{section.title}</h2>
        <p>{section.desc}</p>
      </div>

      <div className="interview-cta">
        <AiMark />
        <div className="grow">
          <div style={{ fontWeight: 600 }}>Prefere conversar?</div>
          <div className="small muted">O assistente faz estas perguntas em linguagem simples e marca as respostas para você revisar.</div>
        </div>
        {pendingSugs.length > 0 && (
          <button className="btn btn-sm" onClick={() => pendingSugs.forEach((q) => apply(suggestions[q.id]))}>
            Aplicar sugestões ({pendingSugs.length})
          </button>
        )}
        <button className="btn btn-sm btn-primary" onClick={onInterview}>
          Responder conversando
        </button>
      </div>

      {section.items.map((q, i) => {
        const v = a.answers[q.id];
        const sug = suggestions[q.id];
        const ev = a.evidence?.[q.id] || "";
        const showEv = openEvidence[q.id] || !!ev;
        return (
          <div key={q.id} id={`q-${q.id}`} className={`q-card ${isAnswered(v) ? "answered" : ""}`}>
            <div className="q-head">
              <span className="q-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="grow">
                <p className="q-prompt">{q.prompt}</p>
                {q.help && <p className="q-help">{q.help}</p>}
                {q.example && <p className="q-example">{q.example}</p>}
                {q.tags.length > 0 && (
                  <div className="q-tags">
                    {q.tags.map((t) => (
                      <span
                        key={t}
                        className={`badge ${t === "Crítico" ? "badge-risk" : t === "Fundamental" ? "badge-solid" : "badge-brand"}`}
                        title={
                          t === "Fundamental"
                            ? "Requisito fundamental: uma resposta baixa aqui limita o nível geral a 3."
                            : t === "Crítico"
                              ? "Ponto crítico de consistência dos dados desta área."
                              : t === "Percepção"
                                ? "Pergunta de opinião: registre um caso concreto na evidência para dar peso à resposta."
                                : `Dimensão de qualidade: ${t}`
                        }
                      >
                        {t === "Fundamental" && <Lock size={10} />}
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={`opts ${q.inline ? "opts-inline" : ""}`} role="radiogroup">
              {q.levels.map((l) => (
                <button
                  key={l.v}
                  role="radio"
                  aria-checked={v === l.v}
                  className={`opt ${v === l.v ? "on" : ""} ${sug?.value === l.v ? "suggested" : ""}`}
                  onClick={() => {
                    const wasEmpty = !isAnswered(v);
                    setAnswer(q.id, v === l.v ? undefined : l.v);
                    if (wasEmpty) {
                      const next = section.items.slice(i + 1).find((x) => !isAnswered(a.answers[x.id]));
                      if (next) setTimeout(() => document.getElementById(`q-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
                    }
                  }}
                >
                  <span className="lv">{l.v}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
            {sug && v !== sug.value && (
              <div className="ai-hint">
                <div className="row-between wrap" style={{ gap: 8 }}>
                  <span>
                    <b>IA sugere {sug.value}</b> · confiança {sug.confidence} — {sug.rationale}
                  </span>
                  <button className="btn btn-xs btn-primary" onClick={() => apply(sug)}>
                    Aplicar
                  </button>
                </div>
              </div>
            )}
            <div className="q-foot">
              <button className={`unknown-btn ${v === UNKNOWN ? "on" : ""}`} onClick={() => {
                  setAnswer(q.id, v === UNKNOWN ? undefined : UNKNOWN);
                  if (v !== UNKNOWN) onUnknown(q);
                }}>
                <CircleHelp size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                Não sei
              </button>
              {q.na && (
                <button
                  className={`unknown-btn ${v === NOT_APPLICABLE ? "on" : ""}`}
                  title="Fica fora do cálculo — use quando a pergunta não faz sentido para a empresa."
                  onClick={() => setAnswer(q.id, v === NOT_APPLICABLE ? undefined : NOT_APPLICABLE)}
                >
                  {q.na}
                </button>
              )}
              <button className="link-btn" onClick={() => onExplain(q)}>
                <AiMark size={9} /> Explicar
              </button>
              {!showEv && (
                <button className="link-btn" onClick={() => setOpenEvidence((o) => ({ ...o, [q.id]: true }))}>
                  <MessageSquareText size={13} /> Evidência / observação
                </button>
              )}
            </div>
            {showEv && (
              <div className="evidence">
                <textarea
                  className="textarea"
                  style={{ minHeight: 56, fontSize: 13 }}
                  value={ev}
                  onChange={(e) => setEvidence(q.id, e.target.value)}
                  placeholder="O que comprova a resposta? (relatório, conciliação, print, quem faz e com que frequência)"
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------
function ReviewStep({
  a,
  sections,
  goTo,
  setAnswer,
  finish,
}: {
  a: Assessment;
  sections: Section[];
  goTo: (qid: string) => void;
  setAnswer: (id: string, v: number) => void;
  finish: (s: Assessment["status"]) => Promise<void>;
}) {
  const toast = useToast();
  const s = scoreAssessment(a);
  const alerts = consistencyAlerts(a);
  const [review, setReview] = useState<ReviewOutput | null>(null);
  const [busy, setBusy] = useState(false);
  const qSections = sections.filter((x): x is Extract<Section, { kind: "questions" }> => x.kind === "questions");
  const unanswered = qSections.flatMap((sec) => sec.items.filter((q) => !isAnswered(a.answers[q.id])).map((q) => ({ sec, q })));
  const blind = qSections.flatMap((sec) => sec.items.filter((q) => a.answers[q.id] === UNKNOWN).map((q) => ({ sec, q })));
  const findPrompt = (qid: string) => qSections.flatMap((x) => x.items).find((q) => q.id === qid)?.prompt ?? qid;

  const copilot = useCopilot();
  const runRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => copilot.registerHandlers({ run_review: () => runRef.current() }), [copilot.registerHandlers]);
  runRef.current = runReview;

  async function runReview() {
    setBusy(true);
    try {
      const { output } = await callSkill<unknown>("review-consistency", assessmentForLlm(a));
      setReview(normReview(output));
    } catch (e) {
      toast(friendlyError(e, "Erro na IA"), "err");
    } finally {
      setBusy(false);
    }
  }

  const verdictLabel = { confiavel: "Diagnóstico confiável", revisar: "Revisar antes de apresentar", inconsistente: "Inconsistências relevantes" };

  return (
    <>
      <div className="section-hero">
        <span className="code">Fechamento</span>
        <h2>Revisão e conclusão</h2>
        <p>Antes de fechar o nível, valide contradições e pontos cegos. Um diagnóstico assertivo vale mais que um diagnóstico otimista.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Metrics
          items={[
            { label: "Perguntas sem resposta", value: unanswered.length },
            { label: "Respondidas com “Não sei”", value: blind.length },
            { label: "Alertas de consistência", value: alerts.length },
          ]}
        />
      </div>

      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div>
              <h3 className="card-title">Regras de consistência</h3>
              <p className="card-sub">Cruzamentos determinísticos entre respostas</p>
            </div>
          </div>
          <div className="card-body">
            {alerts.map((al) => (
              <div key={al.id} className={`callout ${al.severity === "alta" ? "risk" : ""}`}>
                <div className="callout-title">
                  {al.severity === "alta" && <TriangleAlert size={14} />}
                  {al.title}
                </div>
                <div className="muted small">{al.detail}</div>
                <div className="row wrap" style={{ marginTop: 6, gap: 4 }}>
                  {al.refs.map((r) => (
                    <button key={r} className="link-btn" onClick={() => goTo(r)}>
                      → {findPrompt(r).slice(0, 60)}…
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ai-box">
        <div className="row-between wrap">
          <div className="ai-box-head">
            <AiMark /> Revisão com o assistente
          </div>
          <button className="btn btn-sm btn-primary" onClick={runReview} disabled={busy || s.answered < 5}>
            {busy ? <Spinner /> : <Sparkles size={14} />} {review ? "Revisar novamente" : "Revisar diagnóstico"}
          </button>
        </div>
        <p className="small muted" style={{ margin: "8px 0 0" }}>
          O assistente lê todas as respostas como um consultor sênior e aponta contradições, excesso de otimismo e o que confirmar com o time.
        </p>
        {review && (
          <div style={{ marginTop: 14 }} className="stack">
            <div className="row wrap">
              <span className={`badge ${review.verdict === "confiavel" ? "badge-solid" : review.verdict === "inconsistente" ? "badge-risk" : "badge-soft"}`}>{verdictLabel[review.verdict] ?? review.verdict}</span>
            </div>
            <p style={{ margin: 0 }}>{review.summary}</p>
            {review.contradictions?.map((c, i) => (
              <div key={i} className="callout">
                <div className="callout-title">{c.title}</div>
                <div className="small">{c.detail}</div>
                <div className="small muted" style={{ marginTop: 4 }}>
                  <b>Como validar:</b> {c.how_to_validate}
                </div>
              </div>
            ))}
            {review.suggested_adjustments?.length > 0 && (
              <div>
                <p className="section-title" style={{ marginTop: 6 }}>
                  Ajustes sugeridos
                </p>
                {review.suggested_adjustments.map((adj) => (
                  <div key={adj.id} className="row-between wrap small" style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                    <span className="grow">
                      <b>{findPrompt(adj.id)}</b>
                      <br />
                      <span className="muted">
                        {adj.from} → {adj.to}: {adj.reason}
                      </span>
                    </span>
                    <button className="btn btn-xs" onClick={() => setAnswer(adj.id, adj.to)} disabled={a.answers[adj.id] === adj.to}>
                      {a.answers[adj.id] === adj.to ? "Aplicado" : "Aplicar"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {review.blind_spots?.length > 0 && (
              <div>
                <p className="section-title" style={{ marginTop: 6 }}>
                  Pontos cegos a investigar
                </p>
                <ul style={{ margin: 0, paddingLeft: 18 }} className="small">
                  {review.blind_spots.map((b, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <b>{b.topic}</b> — {b.why_it_matters} <span className="muted">Pergunte: “{b.question_to_ask}”</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {unanswered.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <h3 className="card-title">Perguntas sem resposta</h3>
          </div>
          <div className="card-body">
            {unanswered.slice(0, 12).map(({ sec, q }) => (
              <button key={q.id} className="link-btn" style={{ display: "flex", width: "100%", textAlign: "left", padding: "6px 4px" }} onClick={() => goTo(q.id)}>
                <span className="muted" style={{ minWidth: 150 }}>{sec.title}</span> {q.prompt}
              </button>
            ))}
            {unanswered.length > 12 && <p className="xs muted">+ {unanswered.length - 12} outras</p>}
          </div>
        </div>
      )}

      <div className="card card-pad row-between wrap">
        <div>
          <div style={{ fontWeight: 600 }}>
            Nível {s.band ? `${s.band.level} · ${s.band.label}` : "—"} · score {s.overall === null ? "—" : Math.round(s.overall)}
          </div>
          <div className="small muted">Confiabilidade {s.confidence.label.toLowerCase()} ({s.confidence.pct}%). Você pode reabrir e editar depois.</div>
        </div>
        <div className="row btn-row">
          <button className="btn" onClick={() => finish("em_revisao")}>
            Marcar em revisão
          </button>
          <button className="btn btn-primary" onClick={() => finish("concluido")} disabled={s.answered === 0}>
            <Check size={16} /> Concluir e ver relatório
          </button>
        </div>
      </div>
    </>
  );
}
