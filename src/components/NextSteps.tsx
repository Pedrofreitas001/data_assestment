// Próximos passos: cada passo em cartão, com cada informação no seu quadro.
import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, ChevronDown, Clock, Flag, Gauge, Lightbulb, ListChecks, MapPin, Package, Pin, TriangleAlert, User } from "lucide-react";
import { useCopilot } from "../context/copilot";
import { useToast } from "../context/toast";
import { friendlyError } from "../lib/errors";
import { EFFORT_LABEL, WAVES, type PlanStep, type Roadmap } from "../model/roadmap";
import { AiMark } from "./ui";

const planKey = (s: PlanStep) => `plano:${s.id}`;
const weeks = (n: number) => `~${n} semana${n > 1 ? "s" : ""}`;

function stepMarkdown(s: PlanStep) {
  return [
    `**Onde estamos:** ${s.now}`,
    `**Por que importa:** ${[s.matters, ...s.signals].join(" ")}`,
    `**Aonde chegar:** ${s.target}`,
    `**O passo:** ${s.idea}`,
    `**Como fazer:**\n${s.how.map((h, i) => `${i + 1}. ${h}`).join("\n")}`,
    `**Entregável:** ${s.deliverable}`,
    `**Quem conduz:** ${s.owner} · **Prazo típico:** ${s.weeks} semana${s.weeks > 1 ? "s" : ""}`,
    `**Pronto quando:** ${s.done}`,
  ].join("\n\n");
}

export function ProfileBanner({ roadmap, compact }: { roadmap: Roadmap; compact?: boolean }) {
  const p = roadmap.profile;
  return (
    <div className={`sv-profile ${compact ? "compact" : ""}`}>
      <div className="sv-profile-main">
        <span className="sv-kicker">Seu ponto de partida</span>
        <div className="sv-profile-title">{p.title}</div>
        {!compact && <p className="sv-profile-sum">{p.summary}</p>}
      </div>
      <div className="sv-profile-focus">
        <span className="sv-kicker">Foco agora</span>
        <p>{p.focus}</p>
      </div>
    </div>
  );
}

function Tags({ s }: { s: PlanStep }) {
  if (!s.tags.length) return null;
  return (
    <span className="sv-tags">
      {s.tags.map((t) => (
        <span key={t} className={`sv-tag ${t === "Limita o nível" || t === "Crítico" ? "strong" : ""}`}>
          {t}
        </span>
      ))}
    </span>
  );
}

function StepActions({ s }: { s: PlanStep }) {
  const c = useCopilot();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const pinned = c.priorities.some((p) => p.message_id === planKey(s));
  return (
    <div className="sv-actions no-print">
      {pinned ? (
        <span className="sv-pinned">
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

/** Corpo visual do passo: ideia → hoje / por quê / meta → como fazer + entregável. */
function StepVisual({ s }: { s: PlanStep }) {
  return (
    <div className="sv-body">
      {s.idea && (
        <p className="sv-idea">
          <Lightbulb size={16} />
          <span>{s.idea}</span>
        </p>
      )}

      <div className="sv-trio">
        <section className="sv-box">
          <h5 className="sv-lbl">
            <MapPin size={13} /> Hoje
          </h5>
          <p className="sv-quote">“{s.today || "—"}”</p>
          {s.asked && <p className="sv-note">Pergunta: {s.asked}</p>}
          {s.evidence && <p className="sv-note sv-ev">Registro: {s.evidence}</p>}
        </section>
        <section className="sv-box">
          <h5 className="sv-lbl">
            <TriangleAlert size={13} /> Por que importa
          </h5>
          <p className="sv-txt">{s.matters}</p>
        </section>
        <section className="sv-box sv-goal">
          <h5 className="sv-lbl">
            <Flag size={13} /> Aonde chegar
          </h5>
          <p className="sv-txt">{s.target}</p>
        </section>
      </div>

      <div className="sv-duo">
        <section className="sv-box">
          <h5 className="sv-lbl">
            <ListChecks size={13} /> Como fazer
          </h5>
          <ol className="sv-how">
            {s.how.map((h, i) => (
              <li key={h}>
                <span className="sv-how-n">{i + 1}</span>
                <span>{h}</span>
              </li>
            ))}
          </ol>
        </section>
        <div className="sv-side">
          <section className="sv-box">
            <h5 className="sv-lbl">
              <Package size={13} /> Entregável
            </h5>
            <p className="sv-txt">{s.deliverable}</p>
          </section>
          <section className="sv-box">
            <h5 className="sv-lbl">
              <Check size={13} /> Pronto quando
            </h5>
            <p className="sv-txt">{s.done}</p>
          </section>
          <div className="sv-chips">
            <span>
              <User size={12} /> {s.owner}
            </span>
            <span>
              <Clock size={12} /> {weeks(s.weeks)}
            </span>
            <span>
              <Gauge size={12} /> {EFFORT_LABEL[s.effort]}
            </span>
          </div>
        </div>
      </div>
      <StepActions s={s} />
    </div>
  );
}

/** Passo sempre aberto (Onda 1 do relatório). */
export function StepCard({ s, n }: { s: PlanStep; n: number }) {
  return (
    <article className="sv-card avoid">
      <header className="sv-head">
        <span className="sv-n">{n}</span>
        <div className="sv-head-text">
          <h4 className="sv-title">{s.title}</h4>
          <span className="sv-origin">{s.origin.replace(/^D\d · /, "")}</span>
        </div>
        <Tags s={s} />
      </header>
      <StepVisual s={s} />
    </article>
  );
}

/** Passo recolhido: título + ideia; abre o mesmo conteúdo visual. */
export function StepRow({ s, n, defaultOpen }: { s: PlanStep; n?: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <li className={`sv-row ${open ? "open" : ""}`}>
      <button className="sv-row-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {n !== undefined && <span className="sv-n">{n}</span>}
        <span className="sv-head-text">
          <span className="sv-title">{s.title}</span>
          {s.idea && !open && <span className="sv-row-idea">{s.idea}</span>}
          <span className="sv-row-meta">
            <Tags s={s} />
            <span className="sv-row-time">
              <Clock size={11} /> {weeks(s.weeks)}
            </span>
          </span>
        </span>
        <ChevronDown size={18} className="sv-chev no-print" />
      </button>
      {open && <StepVisual s={s} />}
    </li>
  );
}

function WaveList({ steps, limit = 5 }: { steps: PlanStep[]; limit?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? steps : steps.slice(0, limit);
  return (
    <>
      <ul className="sv-list">
        {shown.map((s) => (
          <StepRow key={s.id} s={s} />
        ))}
      </ul>
      {steps.length > limit && (
        <button className="link-btn no-print" style={{ marginTop: 8 }} onClick={() => setAll((v) => !v)}>
          {all ? "Mostrar menos" : `Ver todos (${steps.length})`}
        </button>
      )}
    </>
  );
}

function WaveHead({ w, note }: { w: 1 | 2 | 3; note?: string }) {
  return (
    <div className="sv-wave">
      <span className="sv-wave-pill">{WAVES[w].short}</span>
      <span className="sv-wave-focus">{note || WAVES[w].focus}</span>
    </div>
  );
}

/** Plano completo (relatório). */
export default function NextSteps({ roadmap }: { roadmap: Roadmap }) {
  const byWave = (w: 1 | 2 | 3) => roadmap.steps.filter((s) => s.wave === w);
  const w1 = byWave(1);
  return (
    <>
      <ProfileBanner roadmap={roadmap} />
      <WaveHead w={1} note={`${WAVES[1].focus}. ${roadmap.capacityNote}`} />
      {!w1.length ? (
        <p className="small muted">Nenhum fundamento pendente — siga para as próximas ondas.</p>
      ) : (
        <div className="sv-stack">
          {w1.map((s, i) => (
            <StepCard key={s.id} s={s} n={i + 1} />
          ))}
        </div>
      )}
      {([2, 3] as const).map((w) => {
        const ws = byWave(w);
        if (!ws.length) return null;
        return (
          <div key={w} className="sv-wave-block">
            <WaveHead w={w} />
            <WaveList steps={ws} />
          </div>
        );
      })}
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
        <ul className="sv-list sv-list-cards">
          {first.map((s, i) => (
            <StepRow key={s.id} s={s} n={i + 1} />
          ))}
        </ul>
      )}
    </>
  );
}
