// Próximos passos: perfil da empresa + plano em ondas, com passos executáveis.
import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, ChevronDown, Clock, Pin, User } from "lucide-react";
import { useCopilot } from "../context/copilot";
import { useToast } from "../context/toast";
import { friendlyError } from "../lib/errors";
import { EFFORT_LABEL, WAVES, type PlanStep, type Roadmap } from "../model/roadmap";
import { AiMark } from "./ui";

const planKey = (s: PlanStep) => `plano:${s.id}`;

function stepMarkdown(s: PlanStep) {
  return [
    `**Por quê:** ${s.why}`,
    `**Como fazer:**\n${s.how.map((h, i) => `${i + 1}. ${h}`).join("\n")}`,
    `**Entregável:** ${s.deliverable}`,
    `**Quem conduz:** ${s.owner} · **Prazo típico:** ${s.weeks} semana${s.weeks > 1 ? "s" : ""}`,
    `**Pronto quando:** ${s.done}`,
  ].join("\n\n");
}

export function ProfileBanner({ roadmap, compact }: { roadmap: Roadmap; compact?: boolean }) {
  const p = roadmap.profile;
  return (
    <div className={`profile-box ${compact ? "compact" : ""}`}>
      <div className="section-title" style={{ margin: 0 }}>
        Seu ponto de partida
      </div>
      <div className="profile-title">{p.title}</div>
      <p className="profile-summary">{p.summary}</p>
      <p className="profile-focus">
        <b>Foco agora:</b> {p.focus}
      </p>
    </div>
  );
}

function StepActions({ s }: { s: PlanStep }) {
  const c = useCopilot();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const pinned = c.priorities.some((p) => p.message_id === planKey(s));
  return (
    <div className="step-actions no-print">
      {pinned ? (
        <span className="pin-done">
          <Pin size={12} /> Em Prioridades
        </span>
      ) : (
        <button
          className="btn btn-xs"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await c.addPriority({ title: s.title, question: null, answer: stepMarkdown(s), key: planKey(s) });
              toast("Salvo em Prioridades");
            } catch (e) {
              toast(friendlyError(e, "Não foi possível salvar"), "err");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Pin size={12} /> Priorizar
        </button>
      )}
      <button className="btn btn-xs btn-ghost" onClick={() => c.ask(`Como colocar em prática este passo na nossa empresa, considerando o nosso contexto: "${s.title}"?`, `Como fazer: ${s.title}`)}>
        <AiMark size={9} /> Como fazer aqui?
      </button>
      {s.tool === "glossario" && (
        <Link className="btn btn-xs btn-ghost" to="/glossario">
          <BookOpen size={12} /> Abrir Glossário
        </Link>
      )}
    </div>
  );
}

function StepMeta({ s }: { s: PlanStep }) {
  return (
    <div className="step-meta">
      <span>
        <User size={12} /> {s.owner}
      </span>
      <span>
        <Clock size={12} /> ~{s.weeks} semana{s.weeks > 1 ? "s" : ""}
      </span>
      <span>{EFFORT_LABEL[s.effort]}</span>
      <span className="muted">{s.origin.replace(/^D\d · /, "")}</span>
    </div>
  );
}

function StepBody({ s }: { s: PlanStep }) {
  return (
    <>
      <p className="step-why">{s.why}</p>
      <div className="step-grid">
        <div>
          <div className="step-lbl">Como fazer</div>
          <ol className="step-how">
            {s.how.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
        </div>
        <div>
          <div className="step-lbl">Entregável</div>
          <p className="step-txt">{s.deliverable}</p>
          <div className="step-lbl">Pronto quando</div>
          <p className="step-txt">
            <Check size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
            {s.done}
          </p>
        </div>
      </div>
      <StepActions s={s} />
    </>
  );
}

function Tags({ s }: { s: PlanStep }) {
  if (!s.tags.length) return null;
  return (
    <span className="step-tags">
      {s.tags.map((t) => (
        <span key={t} className={`badge ${t === "Limita o nível" || t === "Crítico" ? "badge-solid" : "badge-brand"}`}>
          {t}
        </span>
      ))}
    </span>
  );
}

export function StepCard({ s, n }: { s: PlanStep; n: number }) {
  return (
    <article className="step-card avoid">
      <div className="step-top">
        <span className="step-n">{n}</span>
        <div className="grow">
          <h4 className="step-title">{s.title}</h4>
          <StepMeta s={s} />
          <Tags s={s} />
        </div>
      </div>
      <StepBody s={s} />
    </article>
  );
}

export function StepRow({ s, defaultOpen }: { s: PlanStep; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <li className={`step-row ${open ? "open" : ""}`}>
      <button className="step-row-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="grow">
          <span className="step-row-title">{s.title}</span>
          <span className="xs muted">
            {s.owner} · ~{s.weeks} sem · {EFFORT_LABEL[s.effort].toLowerCase()}
          </span>
        </span>
        <Tags s={s} />
        <ChevronDown size={16} className="no-print" style={{ flexShrink: 0, color: "var(--ink-3)", transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>
      {open && (
        <div className="step-row-body">
          <StepBody s={s} />
        </div>
      )}
    </li>
  );
}

function WaveList({ steps, limit = 6 }: { steps: PlanStep[]; limit?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? steps : steps.slice(0, limit);
  if (!steps.length) return <p className="small muted">Nada pendente nesta onda.</p>;
  return (
    <>
      <ul className="step-list">
        {shown.map((s) => (
          <StepRow key={s.id} s={s} />
        ))}
      </ul>
      {steps.length > limit && (
        <button className="link-btn no-print" style={{ marginTop: 6 }} onClick={() => setAll((v) => !v)}>
          {all ? "Mostrar menos" : `Ver todos (${steps.length})`}
        </button>
      )}
    </>
  );
}

/** Plano completo (relatório). */
export default function NextSteps({ roadmap }: { roadmap: Roadmap }) {
  const byWave = (w: 1 | 2 | 3) => roadmap.steps.filter((s) => s.wave === w);
  const w1 = byWave(1);
  return (
    <>
      <ProfileBanner roadmap={roadmap} />
      <div className="wave-head">
        <div>
          <b>{WAVES[1].label}</b> <span className="muted small">· {WAVES[1].focus}</span>
        </div>
        <span className="xs muted">{roadmap.capacityNote}</span>
      </div>
      {!w1.length ? (
        <p className="small muted">Nenhum fundamento pendente — siga para as próximas ondas.</p>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {w1.map((s, i) => (
            <StepCard key={s.id} s={s} n={i + 1} />
          ))}
        </div>
      )}
      {([2, 3] as const).map((w) => (
        <div key={w} style={{ marginTop: 26 }}>
          <div className="wave-head">
            <div>
              <b>{WAVES[w].label}</b> <span className="muted small">· {WAVES[w].focus}</span>
            </div>
          </div>
          <WaveList steps={byWave(w)} />
        </div>
      ))}
    </>
  );
}

/** Versão curta para o Início: perfil + 3 primeiros passos. */
export function NextStepsCompact({ roadmap, max = 3 }: { roadmap: Roadmap; max?: number }) {
  const first = roadmap.steps.slice(0, max);
  return (
    <>
      <ProfileBanner roadmap={roadmap} compact />
      {!first.length ? (
        <p className="small muted">Nenhuma ação pendente.</p>
      ) : (
        <ul className="step-list" style={{ marginTop: 14 }}>
          {first.map((s) => (
            <StepRow key={s.id} s={s} />
          ))}
        </ul>
      )}
    </>
  );
}
