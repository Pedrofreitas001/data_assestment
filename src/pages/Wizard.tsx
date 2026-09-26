import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CircleHelp, FileBarChart, Lock, MessageSquareText, Sparkles, TriangleAlert } from "lucide-react";
import { store } from "../lib/store";
import { saveAssessment } from "../lib/assessments";
import { callSkill } from "../lib/llm";
import { assessmentForLlm } from "../lib/snapshot";
import { useToast } from "../context/toast";
import { useOrg } from "../context/org";
import {
  CHECK_OPTIONS,
  DIMENSIONS,
  DOMAINS,
  QUALITY_DIMS,
  SEGMENTS,
  SIZE_BANDS,
  SYSTEM_SUGGESTIONS,
  UNKNOWN,
  type AssessmentContext,
  type LevelOption,
} from "../model/framework";
import { isAnswered, scopedDomains, scoreAssessment } from "../model/scoring";
import { consistencyAlerts } from "../model/consistency";
import type { Assessment } from "../model/types";
import { AiMark, BandScale, Bar, Empty, Field, LoadingPage, Spinner } from "../components/ui";
import { ScoreRing } from "../components/charts";

// ---------------------------------------------------------------------
type Item = { id: string; prompt: string; help?: string; levels: LevelOption[]; tags: string[]; inline?: boolean };
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
interface FillOutput {
  suggestions: Suggestion[];
  follow_up_questions: { id: string; question: string }[];
  notes?: string;
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
  const dims: Section[] = DIMENSIONS.map((d) => ({
    key: d.key,
    group: "Capacidades",
    title: d.title,
    code: d.code,
    desc: d.description,
    refs: d.refs,
    kind: "questions",
    items: d.questions.map((q) => ({ id: q.id, prompt: q.prompt, help: q.help, levels: q.levels, tags: q.gate ? ["Fundacional"] : [] })),
  }));
  const doms: Section[] = scopedDomains(a).map((d) => ({
    key: d.key,
    group: "Consistência da operação",
    title: d.title,
    desc: `${d.description} Fontes típicas: ${d.typicalSources.join(", ")}.`,
    kind: "questions",
    items: d.checks.map((c) => ({ id: c.id, prompt: c.prompt, help: c.help, levels: CHECK_OPTIONS, tags: [QUALITY_LABEL[c.quality], ...(c.critical ? ["Crítico"] : [])], inline: true })),
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
      toast(e instanceof Error ? e.message : "Erro ao salvar", "err");
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

  const go = (i: number) => {
    setStep(Math.max(0, Math.min(sections.length - 1, i)));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) return <LoadingPage />;
  if (!a || !score) return <Empty title="Assessment não encontrado" action={<Link className="btn" to="/assessments">Voltar</Link>} />;

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
      const req = [c.segmento, c.porte, c.dominios?.length ? "x" : ""];
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
              {org?.name} · Assessment
            </p>
            <input
              className="serif"
              value={a.title}
              onChange={(e) => update((x) => ({ ...x, title: e.target.value }))}
              aria-label="Título do assessment"
              style={{ fontSize: 26, border: "none", background: "transparent", padding: 0, outline: "none", width: "min(520px, 70vw)" }}
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
        <nav className="stepper" aria-label="Seções do assessment">
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
                  <span className="t">{s.kind === "questions" && s.code ? `${s.code} · ${s.title}` : s.title}</span>
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
                toast(status === "concluido" ? "Assessment concluído" : "Status atualizado");
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
              Leitura ao vivo
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
          <div className="card card-pad">
            <p className="section-title">Capacidades</p>
            {score.dims.map(({ dim, score: v }) => (
              <div key={dim.key} className="row small" style={{ padding: "5px 0" }}>
                <span className="mono xs muted" style={{ width: 22 }}>
                  {dim.code}
                </span>
                <div className="grow">
                  <Bar value={v} thin />
                </div>
                <span className="num xs" style={{ width: 24, textAlign: "right" }}>
                  {v === null ? "—" : Math.round(v)}
                </span>
              </div>
            ))}
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
  const domains = c.dominios && c.dominios.length ? c.dominios : [];
  const toggleDom = (k: string) => setCtx({ dominios: domains.includes(k) ? domains.filter((x) => x !== k) : [...domains, k] });

  return (
    <>
      <div className="section-hero">
        <span className="code">Etapa 0</span>
        <h2>Contexto da empresa</h2>
        <p>O contexto calibra a leitura: a IA usa estas informações para interpretar respostas e as regras de consistência cruzam segmento e sistemas com as respostas.</p>
      </div>
      <div className="card card-pad">
        <div className="form-section">
          <h4>Identificação</h4>
          <div className="form-grid">
            <Field label="Escopo do diagnóstico" hint="Empresa toda, uma área ou uma unidade.">
              <input className="input" value={a.scope || ""} onChange={(e) => update((x) => ({ ...x, scope: e.target.value }))} />
            </Field>
            <Field label="Respondentes" hint="Nome e cargo de quem está respondendo.">
              <input className="input" value={a.respondent || ""} onChange={(e) => update((x) => ({ ...x, respondent: e.target.value }))} placeholder="Ex.: Marina (Dir. Comercial) + Tiago (BI)" />
            </Field>
            <Field label="Segmento">
              <select className="select" value={c.segmento || ""} onChange={(e) => setCtx({ segmento: e.target.value })}>
                <option value="">Selecione…</option>
                {SEGMENTS.map((s) => (
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
            <Field label="Faturamento anual (faixa)">
              <input className="input" value={c.faturamento || ""} onChange={(e) => setCtx({ faturamento: e.target.value })} placeholder="Ex.: R$ 30–50 mi" />
            </Field>
            <Field label="Lojas / CDs">
              <input className="input" value={c.lojas_cds || ""} onChange={(e) => setCtx({ lojas_cds: e.target.value })} placeholder="Ex.: 12 lojas, 1 CD" />
            </Field>
            <Field label="SKUs ativos (aprox.)">
              <input className="input" value={c.skus || ""} onChange={(e) => setCtx({ skus: e.target.value })} />
            </Field>
            <Field label="Time de dados">
              <input className="input" value={c.time_dados || ""} onChange={(e) => setCtx({ time_dados: e.target.value })} placeholder="Ex.: 1 analista + TI terceirizada" />
            </Field>
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
          <h4>Dores e objetivo</h4>
          <div className="form-grid">
            <Field label="Principais dores com dados hoje" full>
              <textarea className="textarea" value={c.dores || ""} onChange={(e) => setCtx({ dores: e.target.value })} placeholder="Ex.: faturamento do e-commerce não bate com o ERP; ninguém confia no saldo de estoque…" />
            </Field>
            <Field label="O que a empresa quer conseguir com dados em 6 meses?" full>
              <textarea className="textarea" value={c.objetivo || ""} onChange={(e) => setCtx({ objetivo: e.target.value })} style={{ minHeight: 64 }} />
            </Field>
          </div>
        </div>
        <div className="form-section">
          <h4>Domínios da operação em escopo</h4>
          <p className="small muted" style={{ marginTop: -4 }}>
            Cada domínio adiciona um checklist de consistência (4–5 pontos). Selecione os que fazem parte da operação.
          </p>
          <div className="grid g-2" style={{ gap: 8 }}>
            {DOMAINS.map((d) => {
              const on = domains.includes(d.key);
              return (
                <button key={d.key} type="button" className={`opt ${on ? "on" : ""}`} onClick={() => toggleDom(d.key)} style={{ alignItems: "flex-start" }}>
                  <span className="lv">{on ? <Check size={12} /> : ""}</span>
                  <span>
                    <b style={{ fontWeight: 600, color: "inherit" }}>{d.title}</b>
                    <span className="xs" style={{ display: "block", opacity: 0.75 }}>
                      {d.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {!domains.length && <p className="xs muted" style={{ marginTop: 8 }}>Nenhum selecionado = todos os domínios entram no assessment.</p>}
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
}: {
  section: Extract<Section, { kind: "questions" }>;
  a: Assessment;
  setAnswer: (id: string, v: number | undefined) => void;
  setEvidence: (id: string, t: string) => void;
  suggestions: Record<string, Suggestion>;
  setSuggestions: (fn: (s: Record<string, Suggestion>) => Record<string, Suggestion>) => void;
}) {
  const toast = useToast();
  const [aiOpen, setAiOpen] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [busy, setBusy] = useState(false);
  const [followUps, setFollowUps] = useState<{ id: string; question: string }[]>([]);
  const [notes, setNotes] = useState("");
  const [openEvidence, setOpenEvidence] = useState<Record<string, boolean>>({});

  const pendingSugs = section.items.filter((q) => suggestions[q.id] && a.answers[q.id] !== suggestions[q.id].value);

  async function runAssist() {
    if (narrative.trim().length < 20) return toast("Descreva com um pouco mais de detalhe (2–3 frases).", "err");
    setBusy(true);
    try {
      const { output } = await callSkill<FillOutput>("assist-fill", {
        section: {
          title: section.title,
          kind: section.code ? "capacidade" : "dominio_operacional",
          questions: section.items.map((q) => ({ id: q.id, prompt: q.prompt, options: q.levels })),
        },
        narrative,
        context: a.context,
        current_answers: Object.fromEntries(section.items.filter((q) => isAnswered(a.answers[q.id])).map((q) => [q.id, a.answers[q.id]])),
      });
      const valid = (output.suggestions || []).filter((s) => section.items.some((q) => q.id === s.id && q.levels.some((l) => l.v === s.value)));
      setSuggestions((prev) => ({ ...prev, ...Object.fromEntries(valid.map((s) => [s.id, s])) }));
      setFollowUps(output.follow_up_questions || []);
      setNotes(output.notes || "");
      toast(valid.length ? `${valid.length} sugestão(ões) — revise e aplique` : "O relato não trouxe elementos suficientes");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro na IA", "err");
    } finally {
      setBusy(false);
    }
  }

  function apply(s: Suggestion) {
    setAnswer(s.id, s.value);
    if (s.evidence_quote && !(a.evidence?.[s.id] || "").trim()) setEvidence(s.id, `Relato: "${s.evidence_quote}"`);
  }

  return (
    <>
      <div className="section-hero">
        {section.code && <span className="code">{section.code} · {section.refs}</span>}
        {!section.code && <span className="code">Checklist de consistência</span>}
        <h2>{section.title}</h2>
        <p>{section.desc}</p>
      </div>

      <div className="ai-box">
        <div className="row-between wrap">
          <div className="ai-box-head">
            <AiMark />
            <span>
              Preencher com IA
              <span className="xs muted" style={{ fontWeight: 400, display: "block" }}>
                Descreva como funciona hoje — a IA sugere, você decide.
              </span>
            </span>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => setAiOpen((v) => !v)}>
            {aiOpen ? "Fechar" : "Abrir"}
          </button>
        </div>
        {aiOpen && (
          <div style={{ marginTop: 12 }}>
            <textarea
              className="textarea"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder={`Ex.: "${section.code ? "O Tiago monta o relatório de vendas toda segunda juntando o export do ERP com a planilha da VTEX. Ninguém é dono formal dos números…" : "O saldo do ERP e do WMS a gente só confere quando dá problema. Inventário geral é anual…"}"`}
            />
            <div className="row wrap" style={{ marginTop: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={runAssist} disabled={busy}>
                {busy ? <Spinner /> : <Sparkles size={14} />} Sugerir respostas
              </button>
              {pendingSugs.length > 0 && (
                <button className="btn btn-sm" onClick={() => pendingSugs.forEach((q) => apply(suggestions[q.id]))}>
                  Aplicar todas ({pendingSugs.length})
                </button>
              )}
              <span className="xs muted">Senhas e tokens são removidos antes do envio.</span>
            </div>
            {notes && <div className="callout soft" style={{ marginTop: 12 }}>{notes}</div>}
            {followUps.length > 0 && (
              <div className="callout soft" style={{ marginTop: 12 }}>
                <div className="callout-title">
                  <MessageSquareText size={14} /> Perguntas para confirmar com o cliente
                </div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {followUps.map((f) => (
                    <li key={f.id + f.question}>{f.question}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {section.items.map((q, i) => {
        const v = a.answers[q.id];
        const sug = suggestions[q.id];
        const ev = a.evidence?.[q.id] || "";
        const showEv = openEvidence[q.id] || !!ev;
        return (
          <div key={q.id} className={`q-card ${isAnswered(v) ? "answered" : ""}`}>
            <div className="q-head">
              <span className="q-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="grow">
                <p className="q-prompt">{q.prompt}</p>
                {q.help && <p className="q-help">{q.help}</p>}
                {q.tags.length > 0 && (
                  <div className="q-tags">
                    {q.tags.map((t) => (
                      <span key={t} className={`badge ${t === "Crítico" ? "badge-risk" : t === "Fundacional" ? "badge-solid" : "badge-brand"}`}>
                        {t === "Fundacional" && <Lock size={10} />}
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
                  onClick={() => setAnswer(q.id, v === l.v ? undefined : l.v)}
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
              <button className={`unknown-btn ${v === UNKNOWN ? "on" : ""}`} onClick={() => setAnswer(q.id, v === UNKNOWN ? undefined : UNKNOWN)}>
                <CircleHelp size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                Não sei
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

  async function runReview() {
    setBusy(true);
    try {
      const { output } = await callSkill<ReviewOutput>("review-consistency", assessmentForLlm(a));
      setReview(output);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro na IA", "err");
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

      <div className="grid g-3" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="stat-label">Sem resposta</div>
          <div className="stat-value num">{unanswered.length}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">"Não sei" (pontos cegos)</div>
          <div className="stat-value num">{blind.length}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Alertas de consistência</div>
          <div className="stat-value num">{alerts.length}</div>
        </div>
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
            <AiMark /> Revisão de consistência com IA
          </div>
          <button className="btn btn-sm btn-primary" onClick={runReview} disabled={busy || s.answered < 5}>
            {busy ? <Spinner /> : <Sparkles size={14} />} {review ? "Revisar novamente" : "Revisar diagnóstico"}
          </button>
        </div>
        <p className="small muted" style={{ margin: "8px 0 0" }}>
          Um "consultor sênior" lê todas as respostas, evidências e o contexto e aponta contradições, otimismo de autoavaliação e o que perguntar para validar.
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
        <div className="row">
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
