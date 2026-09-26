import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Lock, Pencil, Printer, Sparkles, TriangleAlert } from "lucide-react";
import { store } from "../lib/store";
import { saveAssessment } from "../lib/assessments";
import { callSkill } from "../lib/llm";
import { assessmentForLlm, catalogDigest } from "../lib/snapshot";
import { fmtDate } from "../lib/format";
import { useOrg } from "../context/org";
import { useToast } from "../context/toast";
import { CHECK_OPTIONS, UNKNOWN } from "../model/framework";
import { scoreAssessment, tierFor, TIER_LABEL } from "../model/scoring";
import { consistencyAlerts } from "../model/consistency";
import { DIM_PLAYBOOK, WAVES, buildActionPlan } from "../model/playbook";
import type { AiInsights, Assessment } from "../model/types";
import { AiMark, BandScale, Bar, Empty, LoadingPage, Spinner, StatusBadge } from "../components/ui";
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
  if (!a || !s) return <Empty title="Assessment não encontrado" action={<Link className="btn" to="/assessments">Voltar</Link>} />;

  const capped = s.computedBand && s.band && s.computedBand.level > s.band.level;
  const ai = a.ai_insights;

  async function generate() {
    if (!a || !s) return;
    setBusy(true);
    try {
      const [assets, creds, kpis] = await Promise.all([
        store.list("data_assets", { organization_id: a.organization_id }),
        store.list("credentials", { organization_id: a.organization_id }),
        store.list("kpis", { organization_id: a.organization_id }),
      ]);
      const { output, model } = await callSkill<Omit<AiInsights, "generated_at" | "model">>("generate-insights", {
        empresa: { nome: org?.name, segmento: org?.segment, porte: org?.size },
        assessment: assessmentForLlm(a),
        plano_deterministico: plan.slice(0, 20).map((p) => ({ onda: p.wave, acao: p.title, origem: p.origin, motivo: p.reason })),
        catalogo_e_glossario: catalogDigest(assets, creds, kpis),
      });
      const insights: AiInsights = { ...output, generated_at: new Date().toISOString(), model };
      const saved = await saveAssessment({ ...a, ai_insights: insights });
      setA(saved);
      toast("Insights gerados");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro na IA", "err");
    } finally {
      setBusy(false);
    }
  }

  const waves = ([1, 2, 3] as const).map((w) => ({ w, items: plan.filter((p) => p.wave === w).slice(0, 8) }));

  return (
    <>
      <div className="row-between wrap no-print" style={{ marginBottom: 20 }}>
        <Link to="/assessments" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Assessments
        </Link>
        <div className="row">
          <Link to={`/assessments/${a.id}`} className="btn btn-sm">
            <Pencil size={14} /> Editar respostas
          </Link>
          <button className="btn btn-sm" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir / PDF
          </button>
        </div>
      </div>

      <p className="eyebrow">
        {org?.name} · {a.title} · {fmtDate(a.updated_at)}
      </p>
      <h1 className="page-title" style={{ marginBottom: 24 }}>
        Relatório de maturidade de dados
      </h1>

      {/* HERO */}
      <div className="card hero-result" style={{ marginBottom: 20 }}>
        <div className="left">
          <p className="eyebrow">Nível atribuído</p>
          <div className="hero-level">
            {s.band ? `${s.band.level}` : "—"} <span style={{ fontSize: 40 }}>{s.band?.label}</span>
          </div>
          <p>{s.band?.summary}</p>
          <div style={{ marginTop: 24 }}>
            <BandScale band={s.band} computed={s.computedBand} />
          </div>
          {capped && (
            <p className="small" style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <Lock size={14} style={{ flexShrink: 0, marginTop: 3 }} />
              <span>
                A média indicaria nível {s.computedBand!.level} ({s.computedBand!.label}), mas {s.gates.length === 1 ? "um requisito fundacional está pendente" : `${s.gates.length} requisitos fundacionais estão pendentes`}. Não se pula etapa.
              </span>
            </p>
          )}
        </div>
        <div className="right">
          <div className="kv">
            <div>
              <div className="k">Score geral</div>
              <div className="v num">
                {s.overall === null ? "—" : Math.round(s.overall)}
                <small>/100</small>
              </div>
            </div>
            <div>
              <div className="k">Confiabilidade do diagnóstico</div>
              <div className="v">
                {s.confidence.label}
                <small>{s.confidence.pct}%</small>
              </div>
            </div>
            <div>
              <div className="k">Índice de capacidades (60%)</div>
              <div className="v num">{s.capability === null ? "—" : Math.round(s.capability)}</div>
            </div>
            <div>
              <div className="k">Índice de consistência da operação (40%)</div>
              <div className="v num">{s.operation === null ? "—" : Math.round(s.operation)}</div>
            </div>
          </div>
          <hr className="divider" />
          <div className="small stack" style={{ gap: 6 }}>
            <div className="row-between">
              <span className="muted">Status</span>
              <StatusBadge status={a.status} />
            </div>
            <div className="row-between">
              <span className="muted">Respondentes</span>
              <span style={{ textAlign: "right" }}>{a.respondent || "—"}</span>
            </div>
            <div className="row-between">
              <span className="muted">Escopo</span>
              <span style={{ textAlign: "right" }}>{a.scope || "—"}</span>
            </div>
            <div className="row-between">
              <span className="muted">Cobertura</span>
              <span className="num">
                {s.answered}/{s.total} · {s.blindSpots.length} "não sei"
              </span>
            </div>
          </div>
        </div>
      </div>

      {s.gates.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 20 }}>
          <p className="section-title">Requisitos fundacionais pendentes</p>
          {s.gates.map((g) => (
            <div key={g.questionId} className="callout">
              <div className="callout-title">
                <Lock size={13} /> Limita ao nível {g.capLevel}
              </div>
              <div className="small">{g.reason}</div>
              <div className="xs muted" style={{ marginTop: 3 }}>
                {g.prompt}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI INSIGHTS */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div className="row" style={{ gap: 12 }}>
            <AiMark />
            <div>
              <h3 className="card-title">Leitura executiva</h3>
              <p className="card-sub">{ai ? `Gerada em ${fmtDate(ai.generated_at, true)}${ai.model ? ` · ${ai.model}` : ""} — revise antes de apresentar` : "Resumo, riscos de negócio, quick wins por domínio e roadmap em ondas"}</p>
            </div>
          </div>
          <button className="btn btn-sm btn-ai no-print" onClick={generate} disabled={busy || s.answered < 5}>
            {busy ? <Spinner /> : <Sparkles size={14} />} {ai ? "Regenerar" : "Gerar insights"}
          </button>
        </div>
        <div className="card-body">
          {!ai ? (
            <p className="muted small" style={{ margin: 0 }}>
              {s.answered < 5 ? "Responda ao menos 5 perguntas para gerar a leitura." : "A IA combina respostas, evidências, gates, alertas, plano de ação e o estado do catálogo/glossário para produzir a leitura que a consultoria apresentaria à diretoria."}
            </p>
          ) : (
            <div className="stack" style={{ gap: 20 }}>
              <div>
                <p className="insight-quote">“{ai.headline}”</p>
                <p style={{ margin: 0, color: "var(--ink-2)", maxWidth: 820 }}>{ai.executive_summary}</p>
              </div>
              <div className="grid g-2">
                <div>
                  <p className="section-title">Forças</p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {ai.strengths?.map((x, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="section-title">Riscos de negócio</p>
                  {ai.risks?.map((r, i) => (
                    <div key={i} className={`callout ${r.severity === "alta" ? "risk" : ""}`}>
                      <div className="callout-title">
                        {r.title} <span className="badge badge-soft">{r.severity}</span>
                      </div>
                      <div className="small muted">{r.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
              {ai.domain_insights?.length > 0 && (
                <div>
                  <p className="section-title">Por domínio</p>
                  <div className="grid g-2">
                    {ai.domain_insights.map((d, i) => (
                      <div key={i} className="card card-pad" style={{ boxShadow: "none" }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.domain}</div>
                        <div className="small">{d.insight}</div>
                        <div className="small" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--line)" }}>
                          <b>Quick win:</b> {d.quick_win}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ai.roadmap?.length > 0 && (
                <div>
                  <p className="section-title">Roadmap sugerido pela IA</p>
                  <div className="grid g-3">
                    {ai.roadmap.map((w, i) => (
                      <div key={i} className="wave">
                        <div className="wave-head">
                          <b>{w.wave}</b>
                        </div>
                        {w.actions.map((x, j) => (
                          <div key={j} className="wave-item" style={{ gridTemplateColumns: "22px 1fr" }}>
                            <span className="i">{j + 1}</span>
                            <span className="small">{x}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ai.questions_for_next_meeting?.length > 0 && (
                <div className="callout soft">
                  <div className="callout-title">Para a próxima reunião</div>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18 }} className="small">
                    {ai.questions_for_next_meeting.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CAPACIDADES */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <h3 className="card-title">Capacidades de gestão de dados</h3>
            <p className="card-sub">8 dimensões inspiradas em DAMA-DMBOK, DGI, DCAM e NIST</p>
          </div>
        </div>
        <div className="card-body">
          <div className="grid-radar">
            <div style={{ display: "grid", placeItems: "center" }}>
              <Radar axes={s.dims.map((d) => ({ label: d.dim.code, value: d.score }))} size={340} />
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
                        {tier && <span className={`badge ${tier === "critico" ? "badge-solid" : "badge-soft"}`}>{TIER_LABEL[tier]}</span>}
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
      </div>

      {/* OPERAÇÃO */}
      <div className="card page-break" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <h3 className="card-title">Consistência da operação × dimensões de qualidade</h3>
            <p className="card-sub">Cada célula = média dos pontos de controle daquele domínio naquela dimensão de qualidade</p>
          </div>
        </div>
        <div className="card-body">
          <QualityHeatmap domains={s.domains.map((d) => d.domain)} matrix={s.matrix} />
          <div className="grid g-2" style={{ marginTop: 24 }}>
            <div>
              <p className="section-title">Por domínio</p>
              {s.domains.map(({ domain, score }) => (
                <div key={domain.key} className="meter-row">
                  <div className="lbl">{domain.title}</div>
                  <Bar value={score} thin />
                  <div className="val">{score === null ? "—" : Math.round(score)}</div>
                </div>
              ))}
            </div>
            <div>
              <p className="section-title">Por dimensão de qualidade</p>
              {s.quality.map((q) => (
                <div key={q.key} className="meter-row">
                  <div className="lbl">{q.label}</div>
                  <Bar value={q.score} thin />
                  <div className="val">{q.score === null ? "—" : Math.round(q.score)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-head">
            <div>
              <h3 className="card-title">Alertas de consistência</h3>
              <p className="card-sub">Respostas que se contradizem ou áreas sem visibilidade — valide com evidência</p>
            </div>
          </div>
          <div className="card-body">
            {alerts.map((al) => (
              <div key={al.id} className={`callout ${al.severity === "alta" ? "risk" : ""}`}>
                <div className="callout-title">
                  {al.severity === "alta" && <TriangleAlert size={14} />} {al.title}
                </div>
                <div className="small muted">{al.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PLANO */}
      <div className="card page-break" id="plano" style={{ marginBottom: 20, scrollMarginTop: 20 }}>
        <div className="card-head">
          <div>
            <h3 className="card-title">Plano de ação 30 · 60 · 90</h3>
            <p className="card-sub">Priorizado por lacuna × peso × criticidade. Fundações primeiro: owner → fonte oficial → chave mestra → qualidade → automação.</p>
          </div>
        </div>
        <div className="card-body stack">
          {waves.map(({ w, items }) => (
            <div key={w} className="wave">
              <div className="wave-head">
                <b>{WAVES[w].label}</b>
                <span className="xs muted">{WAVES[w].focus}</span>
              </div>
              {!items.length && <div className="wave-item small muted">Nada pendente nesta onda.</div>}
              {items.map((p, i) => (
                <div key={p.id} className="wave-item">
                  <span className="i">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    {p.title}
                    <div className="xs muted">{p.origin}</div>
                  </div>
                  <span className="badge badge-soft">{p.reason}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ANEXO */}
      <div className="card">
        <div className="card-head">
          <h3 className="card-title">Anexo · respostas e evidências</h3>
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
                      <td className="small">
                        <span className="mono xs muted">{dim.code}</span> {q.prompt}
                      </td>
                      <td className="small">{answerLabel(a.answers[q.id], q.levels)}</td>
                      <td className="small muted">{a.evidence?.[q.id] || ""}</td>
                    </tr>
                  )),
                )}
                {s.domains.flatMap(({ domain }) =>
                  domain.checks.map((c) => (
                    <tr key={c.id}>
                      <td className="small">
                        <span className="xs muted">{domain.title}</span> · {c.prompt}
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
      </div>
    </>
  );
}

function answerLabel(v: number | undefined, levels: { v: number; label: string }[]) {
  if (v === undefined) return <span className="muted">—</span>;
  if (v === UNKNOWN) return <span className="badge badge-dashed">Não sei</span>;
  const l = levels.find((x) => x.v === v);
  return (
    <span>
      <b className="num">{v}</b> · {l?.label}
    </span>
  );
}
