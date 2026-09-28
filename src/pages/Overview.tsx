import { friendlyError } from "../lib/errors";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { BandScale, Bar, Empty, LoadingPage, PageHead, Spinner, StatusBadge } from "../components/ui";
import { supabase } from "../lib/supabase";
import { ScoreRing } from "../components/charts";
import AskBar from "../components/AskBar";
import PrioritiesCard from "../components/Priorities";
import { useCopilot } from "../context/copilot";

export default function Overview() {
  const { org, orgId, loading: orgLoading } = useOrg();
  const { profile, isStaff } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const assessments = useRows("assessments", orgId);

  const latest = assessments.rows[0];
  const s = useMemo(() => (latest ? scoreAssessment(latest) : null), [latest]);
  const next = useMemo(() => (latest && s ? buildActionPlan(latest, s).slice(0, 4) : []), [latest, s]);

  const copilot = useCopilot();
  useEffect(() => {
    if (assessments.loading || !org) return;
    copilot.setFocus({ tela: "Início", latest_assessment_id: latest?.id ?? null });
    if (!latest)
      copilot.nudge({
        id: `home-start-${org.id}`,
        text: `Vamos começar o diagnóstico de **${org.name}**? São perguntas objetivas — e se preferir, eu faço as perguntas em forma de conversa.`,
        actions: [{ type: "start_first", label: "Começar agora" }],
        followUps: ["Como funciona o diagnóstico?", "Quanto tempo leva?"],
      });
    else if (s && s.progress < 1)
      copilot.nudge({
        id: `home-continue-${latest.id}`,
        text: `O diagnóstico está **${Math.round(s.progress * 100)}%** respondido. Quer continuar de onde parou?`,
        actions: [{ type: "continue_assessment", label: "Continuar" }],
      });
    else if (s)
      copilot.nudge({
        id: `home-explain-${latest.id}`,
        text: `${org.name} está no nível **${s.band?.level} · ${s.band?.label}**. Quer que eu explique o que mais pesa nesse resultado?`,
        followUps: ["O que mais pesa no resultado?", "O que fazer nos próximos 30 dias?"],
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessments.loading, org?.id, latest?.id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => copilot.setFocus(null), []);
  useEffect(
    () => copilot.registerHandlers({ start_first: () => startRef.current() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [copilot.registerHandlers],
  );
  const startRef = useRef<() => Promise<void>>(async () => {});

  if (orgLoading || assessments.loading) return <LoadingPage />;
  if (!org)
    return isStaff ? (
      <Empty icon={<Building2 size={20} />} title="Nenhuma empresa cadastrada" action={<Link className="btn btn-primary" to="/admin?novo=1"><Plus size={16} /> Cadastrar empresa</Link>}>
        Cadastre o primeiro cliente para começar o diagnóstico.
      </Empty>
    ) : (
      <FirstAccess />
    );

  async function start() {
    try {
      const a = await createAssessment(org!, profile?.id);
      nav(`/assessments/${a.id}`);
    } catch (e) {
      toast(friendlyError(e, "Erro ao criar"), "err");
    }
  }

  startRef.current = start;

  if (!latest || !s)
    return (
      <>
        <PageHead eyebrow="Início" title={org.name} />
        <div className="card">
          <Empty icon={<ClipboardCheck size={20} />} title="Vamos começar pelo diagnóstico" action={<button className="btn btn-primary" onClick={start}><Plus size={16} /> Iniciar diagnóstico</button>}>
            Cerca de 40 minutos de perguntas objetivas. Ao final você recebe o nível de maturidade e um plano de ação priorizado.
          </Empty>
        </div>
        <PrioritiesCard style={{ marginTop: 20 }} />
        <div style={{ marginTop: 20 }}>
          <AskBar title="Tire dúvidas antes de começar" placeholder="Ex.: o que é maturidade de dados?" chips={["Como funciona o diagnóstico?", "O que é um Data Owner?", "Quem deve responder?"]} />
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

      <div style={{ marginTop: 20 }}>
        <AskBar
          title="Pergunte ao assistente sobre este diagnóstico"
          placeholder="Ex.: por que estamos no nível 2?"
          chips={["O que mais pesa no resultado?", "O que fazer nos próximos 30 dias?", "Explique a nota de Governança"]}
        />
      </div>

      <PrioritiesCard id="prioridades" style={{ marginTop: 20 }} />

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

/** Conta sem empresa: orienta o cliente e permite à gestora o primeiro acesso. */
function FirstAccess() {
  const { refreshProfile, profile } = useAuth();
  const { reloadOrgs } = useOrg();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function claim() {
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_first_admin");
    setBusy(false);
    if (error) return toast(error.message.includes("claim_first_admin") ? "Rode a migração 0003 no Supabase (SQL Editor) e tente de novo." : error.message, "err");
    if (!data) return toast("Já existe uma gestora cadastrada. Peça a ela para vincular sua conta.", "err");
    await refreshProfile();
    await reloadOrgs();
    toast("Pronto! Você agora é a gestora (admin).");
  }
  return (
    <Empty icon={<Building2 size={20} />} title="Sua conta ainda não está vinculada a uma empresa">
      <span style={{ display: "block", marginBottom: 16 }}>
        Se você é cliente, peça à consultoria para vincular sua conta ({profile?.email}).
        <br />
        Se você é da consultoria e este é o primeiro acesso ao sistema, ative sua conta como gestora:
      </span>
      <button className="btn btn-primary" onClick={claim} disabled={busy || !supabase}>
        {busy ? <Spinner /> : "Sou a gestora — ativar acesso de admin"}
      </button>
    </Empty>
  );
}
