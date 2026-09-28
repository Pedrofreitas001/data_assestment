// Prioridades: respostas do assistente que a empresa decidiu transformar em foco.
// Aparece só quando existe ao menos uma — sem prioridades, não ocupa espaço.
import { useState } from "react";
import { Check, ChevronDown, MessageSquare, Trash2 } from "lucide-react";
import { useCopilot } from "../context/copilot";
import { useToast } from "../context/toast";
import { friendlyError } from "../lib/errors";
import { miniMarkdown, relTime } from "../lib/format";
import type { Priority, PriorityStatus } from "../model/types";

const NEXT: Record<PriorityStatus, PriorityStatus> = { aberta: "em_andamento", em_andamento: "concluida", concluida: "aberta" };
const LABEL: Record<PriorityStatus, string> = { aberta: "Aberta", em_andamento: "Em andamento", concluida: "Concluída" };

export default function PrioritiesCard({ id, style }: { id?: string; style?: React.CSSProperties }) {
  const c = useCopilot();
  const [showDone, setShowDone] = useState(false);
  if (c.prioritiesLoading || !c.priorities.length) return null;

  // Em andamento primeiro, depois abertas; concluídas ficam recolhidas.
  const order: PriorityStatus[] = ["em_andamento", "aberta"];
  const active = c.priorities.filter((p) => p.status !== "concluida").sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const done = c.priorities.filter((p) => p.status === "concluida");

  return (
    <section className="card" id={id} style={{ scrollMarginTop: 20, ...style }}>
      <div className="card-head">
        <div>
          <h3 className="card-title">Prioridades</h3>
          <p className="card-sub">Insights do assistente que viraram foco da empresa</p>
        </div>
        <span className="xs muted">
          {active.length} {active.length === 1 ? "ativa" : "ativas"}
        </span>
      </div>
      <div className="card-body" style={{ paddingTop: 4 }}>
        {!active.length && <p className="small muted">Todas as prioridades foram concluídas.</p>}
        <ul className="prio-list">
          {active.map((p) => (
            <Item key={p.id} p={p} />
          ))}
          {showDone && done.map((p) => <Item key={p.id} p={p} />)}
        </ul>
        {done.length > 0 && (
          <button className="link-btn no-print" style={{ marginTop: 8 }} onClick={() => setShowDone((v) => !v)}>
            {showDone ? "Ocultar concluídas" : `Ver concluídas (${done.length})`}
          </button>
        )}
      </div>
    </section>
  );
}

function Item({ p }: { p: Priority }) {
  const c = useCopilot();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const fail = (e: unknown) => toast(friendlyError(e, "Não foi possível salvar"), "err");

  return (
    <li className={`prio-item ${p.status}`}>
      <div className="prio-row">
        <button
          className={`prio-status ${p.status}`}
          onClick={() => c.updatePriority(p.id, { status: NEXT[p.status] }).catch(fail)}
          title={`${LABEL[p.status]} — clique para marcar como ${LABEL[NEXT[p.status]].toLowerCase()}`}
          aria-label={`Status: ${LABEL[p.status]}. Alterar para ${LABEL[NEXT[p.status]]}`}
        >
          {p.status === "concluida" && <Check size={12} strokeWidth={3} />}
        </button>
        <button className="prio-title" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <b>{p.title}</b>
          <span className="xs muted">
            {LABEL[p.status]} · salva {relTime(p.created_at)}
          </span>
        </button>
        <ChevronDown size={16} className="no-print" style={{ color: "var(--ink-3)", transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s", cursor: "pointer" }} onClick={() => setOpen((v) => !v)} />
      </div>
      {open && (
        <div className="prio-body">
          {p.question && <div className="prio-q">“{p.question}”</div>}
          <div className="prio-a" dangerouslySetInnerHTML={{ __html: miniMarkdown(p.answer) }} />
          <div className="prio-actions no-print">
            {p.thread_id && (
              <button className="btn btn-xs" onClick={() => c.openThread(p.thread_id!).catch(fail)}>
                <MessageSquare size={13} /> Revisitar conversa
              </button>
            )}
            <button
              className="btn btn-xs btn-ghost"
              onClick={() => {
                if (confirm("Remover esta prioridade?")) c.removePriority(p.id).catch(fail);
              }}
            >
              <Trash2 size={13} /> Remover
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
