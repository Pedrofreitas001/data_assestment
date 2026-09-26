import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Check, ClipboardCheck, Database, KeyRound, Plus, Sigma } from "lucide-react";
import { useOrg } from "../context/org";
import { useAuth } from "../context/auth";
import { useToast } from "../context/toast";
import { useRows } from "../lib/useRows";
import { createAssessment } from "../lib/assessments";
import { relTime } from "../lib/format";
import { scoreAssessment } from "../model/scoring";
import { consistencyAlerts } from "../model/consistency";
import { buildActionPlan } from "../model/playbook";
import { ASSET_REQUIRED_FIELDS, KPI_REQUIRED_FIELDS, completeness } from "../model/catalogOptions";
import { BandScale, Bar, Empty, LevelPill, LoadingPage, PageHead, StatusBadge } from "../components/ui";
import { ScoreRing } from "../components/charts";

export default function Overview() {
  const { org, orgId, loading: orgLoading } = useOrg();
  const { profile, isStaff } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const assessments = useRows("assessments", orgId);
  const assets = useRows("data_assets", orgId);
  const creds = useRows("credentials", orgId);
  const kpis = useRows("kpis", orgId);

  const latest = assessments.rows[0];
  const s = useMemo(() => (latest ? scoreAssessment(latest) : null), [latest]);
  const alerts = useMemo(() => (latest ? consistencyAlerts(latest) : []), [latest]);
  const plan = useMemo(() => (latest && s ? buildActionPlan(latest, s).filter((a) => a.wave === 1).slice(0, 5) : []), [latest, s]);

  if (orgLoading || assessments.loading) return <LoadingPage />;
  if (!org)
    return (
      <Empty icon={<Building2 size={20} />} title="Nenhuma empresa selecionada" action={isStaff ? <Link className="btn btn-primary" to="/admin">Cadastrar empresa</Link> : undefined}>
        {isStaff ? "Cadastre o primeiro cliente no painel da gestora para começar." : "Sua conta ainda não foi vinculada a uma empresa. Fale com a consultoria Moulis."}
      </Empty>
    );

  async function start() {
    try {
      const a = await createAssessment(org!, profile?.id);
      nav(`/assessments/${a.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao criar", "err");
    }
  }

  const ownerPct = assets.rows.length ? assets.rows.filter((a) => a.owner).length / assets.rows.length : 0;
  const assetCompl = assets.rows.length ? assets.rows.reduce((acc, a) => acc + completeness(a, ASSET_REQUIRED_FIELDS), 0) / assets.rows.length : 0;
  const kpiCompl = kpis.rows.length ? kpis.rows.reduce((acc, k) => acc + completeness(k, KPI_REQUIRED_FIELDS), 0) / kpis.rows.length : 0;
  const credRisk = creds.rows.filter((c) => c.status === "desconhecida" || c.status === "expirada" || !c.vault_location).length;

  // Entregáveis da Fase 0 (critérios de sucesso do manual, cap. 11.2)
  const deliverables = [
    { label: "Assessment concluído e revisado", done: assessments.rows.some((a) => a.status === "concluido") },
    { label: "Fontes críticas mapeadas no catálogo (≥ 5)", done: assets.rows.length >= 5 },
    { label: "Chave mestra de-para (DIM) identificada", done: assets.rows.some((a) => a.tags?.includes("chave-mestra")) || (latest?.answers?.int_chave ?? 0) >= 3 },
    { label: "Owner nomeado em ≥ 80% dos ativos", done: assets.rows.length > 0 && ownerPct >= 0.8 },
    { label: "Credenciais inventariadas e sob controle", done: creds.rows.length > 0 && credRisk === 0 },
    { label: "Glossário com ≥ 5 KPIs e ao menos 1 validado", done: kpis.rows.length >= 5 && kpis.rows.some((k) => k.status === "validado") },
  ];
  const doneCount = deliverables.filter((d) => d.done).length;

  return (
    <>
      <PageHead
        eyebrow={[org.segment, org.size, org.city].filter(Boolean).join(" · ") || "Visão geral"}
        title={org.name}
        desc="Onde a empresa está hoje, o que trava o próximo nível e como está a documentação dos dados."
        actions={
          latest ? (
            <>
              <Link className="btn" to={`/assessments/${latest.id}`}>
                <ClipboardCheck size={16} /> {latest.status === "concluido" ? "Revisar respostas" : "Continuar assessment"}
              </Link>
              <Link className="btn btn-primary" to={`/assessments/${latest.id}/resultado`}>
                Ver relatório <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <button className="btn btn-primary" onClick={start}>
              <Plus size={16} /> Iniciar assessment
            </button>
          )
        }
      />

      {!latest || !s ? (
        <div className="card">
          <Empty icon={<ClipboardCheck size={20} />} title="Comece pelo diagnóstico" action={<button className="btn btn-primary" onClick={start}><Plus size={16} /> Iniciar assessment</button>}>
            São ~45 minutos: contexto da empresa, 8 capacidades e checklists de consistência dos domínios da operação. A IA ajuda a converter relatos em respostas.
          </Empty>
        </div>
      ) : (
        <div className="stack" style={{ gap: 20 }}>
          <div className="grid g-main-side">
            <div className="card card-pad">
              <div className="row-between wrap" style={{ alignItems: "flex-start", gap: 24 }}>
                <div className="grow" style={{ minWidth: 260 }}>
                  <p className="section-title">Maturidade atual · {latest.title}</p>
                  <div className="row wrap" style={{ gap: 10, marginBottom: 14 }}>
                    <LevelPill level={s.band?.level} />
                    <StatusBadge status={latest.status} />
                    <span className="xs muted">atualizado {relTime(latest.updated_at)}</span>
                  </div>
                  <p style={{ margin: "0 0 18px", color: "var(--ink-2)", maxWidth: 520 }}>{s.band?.summary ?? "Responda o assessment para calcular o nível."}</p>
                  <BandScale band={s.band} computed={s.computedBand} />
                  {s.gates.length > 0 && s.computedBand && s.band && s.computedBand.level > s.band.level && (
                    <div className="callout" style={{ marginTop: 16 }}>
                      <div className="callout-title">Nível limitado a {s.band.level} · {s.band.label}</div>
                      <span className="muted">{s.gates[0].reason}</span>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "center" }}>
                  <ScoreRing value={s.overall} size={148} label="SCORE" />
                  <div className="xs muted" style={{ marginTop: 6 }}>
                    Confiabilidade {s.confidence.label.toLowerCase()} · {Math.round(s.progress * 100)}% respondido
                  </div>
                </div>
              </div>
            </div>

            <div className="card card-pad">
              <p className="section-title">Entregáveis da Fase 0</p>
              <div className="row-between" style={{ marginBottom: 12 }}>
                <span className="serif" style={{ fontSize: 30 }}>
                  {doneCount}
                  <span className="muted" style={{ fontSize: 16 }}>/{deliverables.length}</span>
                </span>
                <div style={{ width: 120 }}>
                  <Bar value={(doneCount / deliverables.length) * 100} />
                </div>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {deliverables.map((d) => (
                  <div key={d.label} className="row small" style={{ alignItems: "flex-start", color: d.done ? "var(--ink)" : "var(--ink-3)" }}>
                    <span className={`step-dot ${d.done ? "done" : ""}`} style={{ width: 18, height: 18, marginTop: 1 }}>
                      {d.done && <Check size={11} />}
                    </span>
                    {d.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid g-3">
            <Link to="/catalogo" className="card stat" style={{ textDecoration: "none" }}>
              <div className="stat-label">
                <Database size={14} /> Catálogo de dados
              </div>
              <div className="stat-value num">
                {assets.rows.length}
                <small>ativos</small>
              </div>
              <div className="stat-foot">
                {Math.round(ownerPct * 100)}% com owner · metadados {Math.round(assetCompl * 100)}% completos
              </div>
            </Link>
            <Link to="/catalogo?tab=credenciais" className="card stat" style={{ textDecoration: "none" }}>
              <div className="stat-label">
                <KeyRound size={14} /> Credenciais
              </div>
              <div className="stat-value num">
                {creds.rows.length}
                <small>registradas</small>
              </div>
              <div className="stat-foot">{credRisk ? <span style={{ color: "var(--risk)" }}>{credRisk} sem controle (cofre/status)</span> : "Todas sob controle"}</div>
            </Link>
            <Link to="/glossario" className="card stat" style={{ textDecoration: "none" }}>
              <div className="stat-label">
                <Sigma size={14} /> Glossário de KPIs
              </div>
              <div className="stat-value num">
                {kpis.rows.length}
                <small>KPIs</small>
              </div>
              <div className="stat-foot">
                {kpis.rows.filter((k) => k.status === "validado").length} validados · fichas {Math.round(kpiCompl * 100)}% completas
              </div>
            </Link>
          </div>

          <div className="grid g-2">
            <div className="card">
              <div className="card-head">
                <div>
                  <h3 className="card-title">Capacidades</h3>
                  <p className="card-sub">8 dimensões · índice {s.capability === null ? "—" : Math.round(s.capability)}</p>
                </div>
              </div>
              <div className="card-body">
                {s.dims.map(({ dim, score }) => (
                  <div className="meter-row" key={dim.key}>
                    <div className="lbl">
                      <span className="code">{dim.code}</span>
                      {dim.title}
                    </div>
                    <Bar value={score} thin />
                    <div className="val">{score === null ? "—" : Math.round(score)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="stack">
              <div className="card">
                <div className="card-head">
                  <div>
                    <h3 className="card-title">Consistência da operação</h3>
                    <p className="card-sub">Domínios em escopo · índice {s.operation === null ? "—" : Math.round(s.operation)}</p>
                  </div>
                </div>
                <div className="card-body">
                  {s.domains.map(({ domain, score }) => (
                    <div className="meter-row" key={domain.key}>
                      <div className="lbl">{domain.title}</div>
                      <Bar value={score} thin />
                      <div className="val">{score === null ? "—" : Math.round(score)}</div>
                    </div>
                  ))}
                </div>
              </div>
              {alerts.length > 0 && (
                <div className="card">
                  <div className="card-head">
                    <h3 className="card-title">Alertas de consistência</h3>
                    <span className="badge badge-soft">{alerts.length}</span>
                  </div>
                  <div className="card-body">
                    {alerts.slice(0, 3).map((a) => (
                      <div key={a.id} className={`callout ${a.severity === "alta" ? "risk" : ""}`}>
                        <div className="callout-title">{a.title}</div>
                        <span className="muted small">{a.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {plan.length > 0 && (
            <div className="card">
              <div className="card-head">
                <div>
                  <h3 className="card-title">Próximos 30 dias</h3>
                  <p className="card-sub">Ações da Onda 1, priorizadas pelo que mais limita a maturidade</p>
                </div>
                <Link to={`/assessments/${latest.id}/resultado#plano`} className="btn btn-sm btn-ghost">
                  Plano completo <ArrowRight size={14} />
                </Link>
              </div>
              <div className="card-body" style={{ paddingTop: 8 }}>
                {plan.map((p, i) => (
                  <div key={p.id} className="wave-item" style={{ padding: "11px 0" }}>
                    <span className="i">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      {p.title}
                      <div className="xs muted">{p.origin}</div>
                    </div>
                    <span className="badge badge-soft">{p.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
