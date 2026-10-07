// Próximos passos: leitura leve — uma frase por passo, detalhes só ao abrir.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Pin } from "lucide-react";
import { useCopilot } from "../context/copilot";
import { useToast } from "../context/toast";
import { friendlyError } from "../lib/errors";
import { WAVES, type PlanStep, type Roadmap } from "../model/roadmap";

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

/** Situação em uma linha: perfil + foco. */
export function ProfileBanner({ roadmap }: { roadmap: Roadmap; compact?: boolean }) {
  const p = roadmap.profile;
  return (
    <p className="ns-profile">
      <b>{p.title}.</b> {p.focus}
    </p>
  );
}

function StepActions({ s }: { s: PlanStep }) {
  const c = useCopilot();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const pinned = c.priorities.some((p) => p.message_id === planKey(s));
  return (
    <div className="ns-actions no-print">
      {pinned ? (
        <span className="ns-pinned">
          <Pin size={12} /> Em Prioridades
        </span>
      ) : (
        <button
          className="link-btn"
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
          Priorizar
        </button>
      )}
      <button className="link-btn" onClick={() => c.ask(`Como colocar em prática este passo na nossa empresa, considerando o nosso contexto: "${s.title}"?`, `Como fazer: ${s.title}`)}>
        Como fazer aqui?
      </button>
      {s.tool === "glossario" && (
        <Link className="link-btn" to="/glossario">
          Abrir Glossário
        </Link>
      )}
    </div>
  );
}

function StepDetail({ s }: { s: PlanStep }) {
  return (
    <div className="ns-detail">
      <dl className="ns-facts">
        <dt>Hoje</dt>
        <dd>{s.today ? `“${s.today}”` : s.now}</dd>
        <dt>Por quê</dt>
        <dd>{s.matters}</dd>
        <dt>Meta</dt>
        <dd>{s.target}</dd>
      </dl>
      <ol className="ns-how">
        {s.how.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ol>
      <p className="ns-done">
        <b>Pronto quando:</b> {s.done}
      </p>
      <p className="ns-meta">
        {s.owner} · {weeks(s.weeks)}
      </p>
      <StepActions s={s} />
    </div>
  );
}

export function StepRow({ s, n, defaultOpen }: { s: PlanStep; n?: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const gate = s.tags.includes("Limita o nível");
  return (
    <li className={`ns-item ${open ? "open" : ""}`}>
      <button className="ns-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {n !== undefined && <span className="ns-n">{n}</span>}
        <span className="ns-text">
          <span className="ns-title">
            {s.title}
            {gate && <span className="ns-flag">limita o nível</span>}
          </span>
          {s.idea && <span className="ns-idea">{s.idea}</span>}
        </span>
        <ChevronDown size={16} className="ns-chev no-print" />
      </button>
      {open && <StepDetail s={s} />}
    </li>
  );
}

function StepList({ steps, numbered, limit, firstOpen }: { steps: PlanStep[]; numbered?: boolean; limit?: number; firstOpen?: boolean }) {
  const [all, setAll] = useState(false);
  const shown = limit && !all ? steps.slice(0, limit) : steps;
  return (
    <>
      <ol className="ns-list">
        {shown.map((s, i) => (
          <StepRow key={s.id} s={s} n={numbered ? i + 1 : undefined} defaultOpen={firstOpen && i === 0} />
        ))}
      </ol>
      {limit && steps.length > limit && (
        <button className="link-btn no-print ns-more" onClick={() => setAll((v) => !v)}>
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
      <div className="ns-wave">
        <span className="ns-wave-t">{WAVES[1].short}</span>
        <span className="ns-wave-n">{roadmap.capacityNote}</span>
      </div>
      {w1.length ? <StepList steps={w1} numbered firstOpen /> : <p className="small muted">Nenhum fundamento pendente.</p>}
      {([2, 3] as const).map((w) => {
        const ws = byWave(w);
        if (!ws.length) return null;
        return (
          <div key={w}>
            <div className="ns-wave">
              <span className="ns-wave-t">{WAVES[w].short}</span>
              <span className="ns-wave-n">{WAVES[w].focus}</span>
            </div>
            <StepList steps={ws} limit={4} />
          </div>
        );
      })}
    </>
  );
}

/** Versão curta para o Início: situação + 3 primeiros passos. */
export function NextStepsCompact({ roadmap, max = 3 }: { roadmap: Roadmap; max?: number }) {
  const first = roadmap.steps.slice(0, max);
  return (
    <>
      <ProfileBanner roadmap={roadmap} />
      {first.length ? <StepList steps={first} numbered /> : <p className="small muted">Nenhuma ação pendente.</p>}
    </>
  );
}
