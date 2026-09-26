import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, ClipboardCheck, Lock, Plus } from "lucide-react";
import { useOrg } from "../context/org";
import { useAuth } from "../context/auth";
import { useToast } from "../context/toast";
import { useRows } from "../lib/useRows";
import { createAssessment } from "../lib/assessments";
import { relTime } from "../lib/format";
import { scoreAssessment } from "../model/scoring";
import { buildActionPlan } from "../model/playbook";
import { BandScale, Bar, Empty, LoadingPage, PageHead, StatusBadge } from "../components/ui";
import { ScoreRing } from "../components/charts";

export default function Overview() {
  const { org, orgId, loading: orgLoading } = useOrg();
  const { profile, isStaff } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const assessments = useRows("assessments", orgId);

  const latest = assessments.rows[0];
  const s = useMemo(() => (latest ? scoreAssessment(latest) : null), [latest]);
  const next = useMemo(() => (latest && s ? buildActionPlan(latest, s).slice(0, 4) : []), [latest, s]);

  if (orgLoading || assessments.loading) return <LoadingPage />;
  if (!org)
    return (
      <Empty icon={<Building2 size={20} />} title="Nenhuma empresa selecionada" action={isStaff ? <Link className="btn btn-primary" to="/admin">Cadastrar cliente</Link> : undefined}>
        {isStaff ? "Cadastre o primeiro cliente para começar." : "Sua conta ainda não foi vinculada a uma empresa. Fale com a consultoria."}
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

  if (!latest || !s)
    return (
      <>
        <PageHead eyebrow="Início" title={org.name} />
        <div className="card">
          <Empty icon={<ClipboardCheck size={20} />} title="Vamos começar pelo diagnóstico" action={<button className="btn btn-primary" onClick={start}><Plus size={16} /> Iniciar diagnóstico</button>}>
            Cerca de 40 minutos de perguntas objetivas. Ao final você recebe o nível de maturidade e um plano de ação priorizado.
          </Empty>
        </div>
      </>
    );

  const capped = s.computedBand && s.band && s.computedBand.level > s.band.level;
  const done = latest.status === "concluido";

  return (
    <>
      <PageHead
        eyebrow="Início"
        title={org.name}
        actions={
          <>
            <Link className="btn" to={`/assessments/${latest.id}`}>
              {done ? "Revisar respostas" : "Continuar diagnóstico"}
            </Link>
            <Link className="btn btn-primary" to={`/assessments/${latest.id}/resultado`}>
              Ver relatório <ArrowRight size={16} />
            </Link>
          </>
        }
      />

      <section className="card hero-home">
        <div className="hero-main">
          <div className="row wrap" style={{ gap: 10, marginBottom: 18 }}>
            <span className="section-title" style={{ margin: 0 }}>
              Nível de maturidade
            </span>
            <StatusBadge status={latest.status} />
            <span className="xs muted">atualizado {relTime(latest.updated_at)}</span>
          </div>
          <div className="hero-level-line">
            <span className="hero-level-num" style={{ color: s.band?.color }}>
              {s.band?.level ?? "—"}
            </span>
            <span className="hero-level-name">{s.band?.label ?? "Sem respostas"}</span>
          </div>
          <p className="hero-summary">{s.band?.summary}</p>
          <div style={{ maxWidth: 520 }}>
            <BandScale band={s.band} computed={s.computedBand} />
          </div>
          {capped && (
            <p className="small muted" style={{ margin: "16px 0 0", display: "flex", gap: 8 }}>
              <Lock size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              Pela média estaria no nível {s.computedBand!.level}, mas há fundamentos pendentes que limitam o resultado.
            </p>
          )}
        </div>
        <div className="hero-side">
          <ScoreRing value={s.overall} size={150} label="SCORE" />
          <div className="xs muted" style={{ marginTop: 10, textAlign: "center" }}>
            {Math.round(s.progress * 100)}% respondido · confiabilidade {s.confidence.label.toLowerCase()}
          </div>
        </div>
      </section>

      <div className="grid g-2" style={{ marginTop: 20 }}>
        <section className="card">
          <div className="card-head">
            <h3 className="card-title">Por capacidade</h3>
          </div>
          <div className="card-body">
            {s.dims.map(({ dim, score }) => (
              <div className="meter-row" key={dim.key}>
                <div className="lbl">{dim.title}</div>
                <Bar value={score} thin />
                <div className="val">{score === null ? "—" : Math.round(score)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3 className="card-title">Próximos passos</h3>
            <Link to={`/assessments/${latest.id}/resultado#plano`} className="btn btn-sm btn-ghost">
              Plano completo <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body">
            {!next.length && <p className="small muted">Nenhuma ação pendente.</p>}
            <ol className="steps-list">
              {next.map((p) => (
                <li key={p.id}>
                  <span>{p.title}</span>
                  <span className="xs muted">{p.origin.replace(/^D\d · /, "")}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </>
  );
}
