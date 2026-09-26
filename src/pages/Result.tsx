import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Lock, Pencil, Printer, Sparkles } from "lucide-react";
import { store } from "../lib/store";
import { saveAssessment } from "../lib/assessments";
import { callSkill } from "../lib/llm";
import { assessmentForLlm, kpiDigest } from "../lib/snapshot";
import { fmtDate } from "../lib/format";
import { useOrg } from "../context/org";
import { useToast } from "../context/toast";
import { CHECK_OPTIONS, UNKNOWN } from "../model/framework";
import { scoreAssessment, tierFor, TIER_LABEL } from "../model/scoring";
import { consistencyAlerts } from "../model/consistency";
import { DIM_PLAYBOOK, WAVES, buildActionPlan } from "../model/playbook";
import type { AiInsights, Assessment } from "../model/types";
import { AiMark, BandScale, Empty, LoadingPage, Spinner } from "../components/ui";
import { QualityHeatmap, Radar } from "../components/charts";

export default function Result() {
  const { id } = useParams();
  const { org } = useOrg();
  const toast = useToast();
  const loc = useLocation();
  const [a, setA] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    store.get("assessments", id!).then((r) => {
      setA(r);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!loading && loc.hash) document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
  }, [loading, loc.hash]);

  const s = useMemo(() => (a ? scoreAssessment(a) : null), [a]);
  const alerts = useMemo(() => (a ? consistencyAlerts(a) : []), [a]);
  const plan = useMemo(() => (a && s ? buildActionPlan(a, s) : []), [a, s]);

  if (loading) return <LoadingPage />;
  if (!a || !s) return <Empty title="Diagnóstico não encontrado" action={<Link className="btn" to="/assessments">Voltar</Link>} />;

  const capped = s.computedBand && s.band && s.computedBand.level > s.band.level;
  const ai = a.ai_insights;

  async function generate() {
    if (!a || !s) return;
    setBusy(true);
    try {
      const kpis = await store.list("kpis", { organization_id: a.organization_id });
      const { output, model } = await callSkill<Omit<AiInsights, "generated_at" | "model">>("generate-insights", {
        empresa: { nome: org?.name, segmento: org?.segment, porte: org?.size },
        assessment: assessmentForLlm(a),
        plano_deterministico: plan.slice(0, 20).map((p) => ({ onda: p.wave, acao: p.title, origem: p.origin, motivo: p.reason })),
        glossario: kpiDigest(kpis),
      });
      const insights: AiInsights = { ...output, generated_at: new Date().toISOString(), model };
      const saved = await saveAssessment({ ...a, ai_insights: insights });
      setA(saved);
      toast("Leitura executiva gerada");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro na IA", "err");
    } finally {
      setBusy(false);
    }
  }

  const waves = ([1, 2, 3] as const).map((w) => ({ w, items: plan.filter((p) => p.wave === w).slice(0, 5) }));
  const attention = [
    ...s.gates.map((g) => ({ key: g.questionId, title: `Limita o nível a ${g.capLevel}`, detail: g.reason, high: true })),
    ...alerts.map((al) => ({ key: al.id, title: al.title, detail: al.detail, high: al.severity === "alta" })),
  ];

  return (
    <>
      <div className="row-between wrap no-print" style={{ marginBottom: 24 }}>
        <Link to="/assessments" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Diagnósticos
        </Link>
        <div className="row">
          <Link to={`/assessments/${a.id}`} className="btn btn-sm">
            <Pencil size={14} /> Editar respostas
          </Link>
          <button className="btn btn-sm" onClick={() => window.print()}>
            <Printer size={14} /> Exportar PDF
          </button>
        </div>
      </div>

      <p className="eyebrow">
        {org?.name} · {fmtDate(a.updated_at)}
      </p>
      <h1 className="page-title" style={{ marginBottom: 28 }}>
        Relatório de maturidade de dados
      </h1>

      {/* Nível */}
      <section className="card hero-home" style={{ marginBottom: 20 }}>
        <div className="hero-main">
          <p className="section-title">Nível atribuído</p>
          <div className="hero-level-line">
            <span className="hero-level-num" style={{ color: s.band?.color }}>
              {s.band?.level ?? "—"}
            </span>
            <span className="hero-level-name">{s.band?.label}</span>
          </div>
          <p className="hero-summary">{s.band?.summary}</p>
          <div style={{ maxWidth: 520 }}>
            <BandScale band={s.band} computed={s.computedBand} />
          </div>
          {capped && (
            <p className="small muted" style={{ margin: "16px 0 0", display: "flex", gap: 8 }}>
              <Lock size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              Pela média estaria no nível {s.computedBand!.level} ({s.computedBand!.label}), mas fundamentos pendentes limitam o resultado — veja “Pontos de atenção”.
            </p>
          )}
        </div>
        <div className="hero-side kv-side">
          <div className="kv-item">
            <div className="k">Score geral</div>
            <div className="v num">
              {s.overall === null ? "—" : Math.round(s.overall)}
              <small>/100</small>
            </div>
          </div>
          <div className="kv-item">
            <div className="k">Capacidades</div>
            <div className="v num">{s.capability === null ? "—" : Math.round(s.capability)}</div>
          </div>
          <div className="kv-item">
            <div className="k">Qualidade por área</div>
            <div className="v num">{s.operation === null ? "—" : Math.round(s.operation)}</div>
          </div>
          <div className="kv-item">
            <div className="k">Confiabilidade</div>
            <div className="v">{s.confidence.label}</div>
          </div>
        </div>
      </section>

      {/* Leitura executiva */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div className="row" style={{ gap: 12 }}>
            <AiMark />
            <div>
              <h3 className="card-title">Leitura executiva</h3>
              <p className="card-sub">{ai ? `Gerada em ${fmtDate(ai.generated_at, true)} · revise antes de apresentar` : "Resumo, riscos e roadmap escritos pela IA a partir das respostas"}</p>
            </div>
          </div>
          <button className="btn btn-sm no-print" onClick={generate} disabled={busy || s.answered < 5}>
            {busy ? <Spinner /> : <Sparkles size={14} />} {ai ? "Gerar novamente" : "Gerar leitura"}
          </button>
        </div>
        {ai && (
          <div className="card-body stack" style={{ gap: 22 }}>
            <div>
              <p className="insight-quote">{ai.headline}</p>
              <p style={{ margin: 0, color: "var(--ink-2)", maxWidth: 820 }}>{ai.executive_summary}</p>
            </div>
            <div className="grid g-2" style={{ gap: 28 }}>
              <div>
                <p className="section-title">Forças</p>
                <ul className="plain-list">
                  {ai.strengths?.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="section-title">Riscos</p>
                <ul className="plain-list">
                  {ai.risks?.map((r, i) => (
                    <li key={i}>
                      <b style={{ fontWeight: 600 }}>{r.title}.</b> <span className="muted">{r.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {ai.domain_insights?.length > 0 && (
              <div>
                <p className="section-title">Ganhos rápidos por área</p>
                <ul className="plain-list">
                  {ai.domain_insights.map((d, i) => (
                    <li key={i}>
                      <b style={{ fontWeight: 600 }}>{d.domain}:</b> {d.quick_win}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ai.questions_for_next_meeting?.length > 0 && (
              <div>
                <p className="section-title">Para a próxima reunião</p>
                <ul className="plain-list">
                  {ai.questions_for_next_meeting.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Capacidades */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <h3 className="card-title">Capacidades</h3>
        </div>
        <div className="card-body">
          <div className="grid-radar">
            <div style={{ display: "grid", placeItems: "center" }}>
              <Radar axes={s.dims.map((d) => ({ label: d.dim.code, value: d.score }))} size={320} />
            </div>
            <div className="dim-list">
              {s.dims.map(({ dim, score }) => {
                const tier = tierFor(score);
                return (
                  <div key={dim.key} className="dim-item">
                    <span className="code">{dim.code}</span>
                    <div>
                      <div className="row wrap" style={{ gap: 8 }}>
                        <span className="ttl">{dim.title}</span>
                        {tier && <span className={`badge ${tier === "critico" ? "badge-risk" : tier === "atencao" ? "badge-warn" : "badge-ok"}`}>{TIER_LABEL[tier]}</span>}
                      </div>
                      <div className="txt">{tier ? DIM_PLAYBOOK[dim.key][tier] : "Sem respostas nesta dimensão."}</div>
                    </div>
                    <span className="sc num">{score === null ? "—" : Math.round(score)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Qualidade por área */}
      <section className="card page-break" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <h3 className="card-title">Qualidade dos dados por área</h3>
            <p className="card-sub">Nota de 0 a 100 em cada dimensão de qualidade</p>
          </div>
        </div>
        <div className="card-body">
          <QualityHeatmap domains={s.domains.map((d) => d.domain)} matrix={s.matrix} />
        </div>
      </section>

      {/* Pontos de atenção */}
      {attention.length > 0 && (
        <section className="card" style={{ marginBottom: 20 }}>
          <div className="card-head">
            <div>
              <h3 className="card-title">Pontos de atenção</h3>
              <p className="card-sub">Fundamentos pendentes e respostas que merecem validação com evidência</p>
            </div>
          </div>
          <div className="card-body">
            <ul className="attention">
              {attention.map((x) => (
                <li key={x.key}>
                  <span className={`dot ${x.high ? "dot-risk" : ""}`} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{x.title}</div>
                    <div className="small muted">{x.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Plano */}
      <section className="card page-break" id="plano" style={{ marginBottom: 20, scrollMarginTop: 20 }}>
        <div className="card-head">
          <div>
            <h3 className="card-title">Plano de ação</h3>
            <p className="card-sub">Priorizado pelo que mais limita a maturidade</p>
          </div>
        </div>
        <div className="card-body">
          <div className="plan-cols">
            {waves.map(({ w, items }) => (
              <div key={w} className="plan-col">
                <div className="plan-head">
                  <b>{WAVES[w].label}</b>
                </div>
                {!items.length && <p className="small muted">Nada pendente.</p>}
                <ol className="steps-list">
                  {items.map((p) => (
                    <li key={p.id}>
                      <span>{p.title}</span>
                      <span className="xs muted">{p.origin.replace(/^D\d · /, "")}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Anexo */}
      <section className="card">
        <div className="card-head" style={{ paddingBottom: showAnswers ? 0 : 20 }}>
          <h3 className="card-title">Respostas e evidências</h3>
          <button className="btn btn-sm btn-ghost no-print" onClick={() => setShowAnswers((v) => !v)}>
            {showAnswers ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        {showAnswers && (
          <div className="card-body table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pergunta</th>
                  <th>Resposta</th>
                  <th>Evidência</th>
                </tr>
              </thead>
              <tbody>
                {s.dims.flatMap(({ dim }) =>
                  dim.questions.map((q) => (
                    <tr key={q.id}>
                      <td className="small">{q.prompt}</td>
                      <td className="small">{answerLabel(a.answers[q.id], q.levels)}</td>
                      <td className="small muted">{a.evidence?.[q.id] || ""}</td>
                    </tr>
                  )),
                )}
                {s.domains.flatMap(({ domain }) =>
                  domain.checks.map((c) => (
                    <tr key={c.id}>
                      <td className="small">
                        <span className="muted">{domain.title} ·</span> {c.prompt}
                      </td>
                      <td className="small">{answerLabel(a.answers[c.id], CHECK_OPTIONS)}</td>
                      <td className="small muted">{a.evidence?.[c.id] || ""}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function answerLabel(v: number | undefined, levels: { v: number; label: string }[]) {
  if (v === undefined) return <span className="muted">—</span>;
  if (v === UNKNOWN) return <span className="badge badge-dashed">Não sei</span>;
  return levels.find((x) => x.v === v)?.label;
}
