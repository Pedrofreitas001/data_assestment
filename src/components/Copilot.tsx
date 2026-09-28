import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, ArrowUp, Check, History, MessageCircleQuestion, Pin, Plus, Trash2, X } from "lucide-react";
import { useCopilot, type CopilotMessage } from "../context/copilot";
import { miniMarkdown, relTime } from "../lib/format";
import { friendlyError } from "../lib/errors";
import { useToast } from "../context/toast";
import { AiMark, Spinner } from "./ui";

const STARTERS: Record<string, string[]> = {
  "": ["Onde estamos hoje e por quê?", "O que devo fazer primeiro?", "Como funciona o diagnóstico?"],
  assessments: ["Me explique esta seção", "Como descubro a resposta certa?", "O que é um Data Owner?"],
  glossario: ["Quais KPIs devemos ter primeiro?", "Como escrever premissas de um KPI?", "O que é granularidade?"],
  framework: ["Por que o owner limita o nível?", "Explique as dimensões de qualidade"],
  admin: ["Como comparar clientes?", "Quais clientes precisam de atenção?"],
};

export default function Copilot() {
  const c = useCopilot();
  const loc = useLocation();
  const [input, setInput] = useState("");
  const [view, setView] = useState<"chat" | "history">("chat");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const page = loc.pathname.split("/")[1] || "";
  const onResult = loc.pathname.endsWith("/resultado");

  // Chaves obrigatórias: scrollIntoView retorna uma Promise nos navegadores novos,
  // e o React trataria esse retorno como função de limpeza do efeito.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [c.messages, c.busy, c.isOpen]);
  // Qualquer conversa aberta (inclusive por fora do painel) volta para o chat.
  useEffect(() => {
    setView("chat");
  }, [c.threadId]);
  useEffect(() => {
    if (c.isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [c.isOpen, c.interview]);

  const starters = onResult
    ? ["Escreva um resumo para a diretoria", "Prepare um e-mail com os resultados", "Quais os 3 riscos mais urgentes?"]
    : STARTERS[page] ?? STARTERS[""];

  function submit() {
    if (!input.trim()) return;
    c.send(input);
    setInput("");
  }

  if (!c.isOpen)
    return (
      <div className="fab-wrap no-print">
        {c.bubble && (
          <div className="bubble" role="status">
            <button className="bubble-x" onClick={c.dismissBubble} aria-label="Dispensar">
              <X size={14} />
            </button>
            <div className="bubble-head">
              <AiMark size={11} /> Assistente Moulis
            </div>
            <div className="bubble-text" dangerouslySetInnerHTML={{ __html: miniMarkdown(c.bubble.text) }} />
            <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
              {c.bubble.actions?.map((a) => (
                <button
                  key={a.type + a.label}
                  className="btn btn-xs btn-primary"
                  onClick={async () => {
                    c.acceptBubble();
                    await c.runAction(a);
                  }}
                >
                  {a.label}
                </button>
              ))}
              <button className="btn btn-xs" onClick={c.acceptBubble}>
                Conversar
              </button>
            </div>
          </div>
        )}
        <button className="fab" onClick={c.open} aria-label="Abrir assistente">
          <AiMark size={13} /> <span className="fab-label">Assistente</span>
          {c.bubble && <span className="fab-dot" />}
        </button>
      </div>
    );

  return (
    <aside className="copilot no-print" aria-label="Assistente Moulis">
      <header className="copilot-head">
        <AiMark />
        <div className="grow">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Assistente Moulis</div>
          <div className="xs" style={{ color: "#9a9a96" }}>
            {view === "history" ? "Conversas desta empresa" : c.interview ? `Entrevista · ${c.interview.title}` : "Explica, interpreta e redige com você"}
          </div>
        </div>
        <button
          className={`side-btn ${view === "history" ? "on" : ""}`}
          onClick={() => {
            if (view === "history") return setView("chat");
            setView("history");
            c.loadThreads();
          }}
          title="Conversas anteriores"
          aria-label="Conversas anteriores"
          style={{ color: view === "history" ? "#fff" : "#bbb" }}
        >
          <History size={16} />
        </button>
        {(c.messages.length > 0 || view === "history") && (
          <button
            className="side-btn"
            onClick={() => {
              c.reset();
              setView("chat");
            }}
            title="Nova conversa"
            aria-label="Nova conversa"
            style={{ color: "#bbb" }}
          >
            <Plus size={17} />
          </button>
        )}
        <button className="side-btn" onClick={c.close} aria-label="Fechar" style={{ color: "#fff" }}>
          <X size={18} />
        </button>
      </header>

      {view === "history" && <HistoryView onBack={() => setView("chat")} />}

      {view === "chat" && c.interview && (
        <div className="interview-bar">
          <span>
            <b>Modo entrevista</b> — responda com suas palavras; eu marco as opções para você revisar.
          </span>
          <button className="link-btn" onClick={c.stopInterview}>
            Encerrar
          </button>
        </div>
      )}

      <div className="copilot-msgs" hidden={view !== "chat"}>
        {!c.messages.length && (
          <div className="copilot-empty">
            <div className="ai-mark" style={{ width: 36, height: 36, borderRadius: 10 }}>
              <MessageCircleQuestion size={18} />
            </div>
            <h4>Como posso ajudar?</h4>
            <p>Pergunte qualquer coisa sobre o diagnóstico, peça para explicar um conceito ou para redigir um texto do relatório.</p>
            <div className="suggest">
              {starters.map((s) => (
                <button key={s} className="chip" onClick={() => c.send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {c.messages.map((m) => (
          <Message key={m.id} m={m} onResult={onResult} />
        ))}
        {c.busy && (
          <div className="msg msg-ai row">
            <Spinner /> <span className="muted small">{c.interview ? "Entendendo sua resposta…" : "Pensando…"}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        hidden={view !== "chat"}
        className="copilot-input"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={inputRef}
          className="input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={c.interview ? "Conte como funciona na sua empresa…" : "Pergunte ou peça um texto…"}
          aria-label="Mensagem"
        />
        <button className="btn btn-primary btn-icon" disabled={c.busy || !input.trim()} aria-label="Enviar">
          <ArrowUp size={17} />
        </button>
      </form>
      <label className="copilot-foot" hidden={view !== "chat"}>
        <input type="checkbox" className="check" checked={c.proactive} onChange={(e) => c.setProactive(e.target.checked)} /> Sugestões automáticas do assistente
      </label>
    </aside>
  );
}

function Message({ m, onResult }: { m: CopilotMessage; onResult: boolean }) {
  const c = useCopilot();
  if (m.role === "user") return <div className="msg msg-user">{m.content}</div>;

  const pending = (m.suggestions || []).filter((s) => !m.applied?.includes(s.id));
  const canSave = onResult && m.kind !== "nudge" && m.kind !== "error" && c.availableActions.includes("add_to_report") && m.content.length > 200;

  return (
    <div className={`msg msg-ai ${m.kind === "error" ? "msg-err" : ""}`}>
      <div dangerouslySetInnerHTML={{ __html: miniMarkdown(m.content) }} />

      {!!m.suggestions?.length && (
        <div className="sugg-box">
          <div className="sugg-head">
            <span>Marcações sugeridas</span>
            {pending.length > 1 && (
              <button className="btn btn-xs btn-primary" onClick={() => c.applySuggestions(m.id, pending)}>
                Aplicar todas
              </button>
            )}
          </div>
          {m.suggestions.map((s) => {
            const done = m.applied?.includes(s.id);
            return (
              <div key={s.id} className="sugg-row">
                <div className="grow">
                  <div className="xs muted">{s.prompt}</div>
                  <div className="small" style={{ fontWeight: 600 }}>
                    {s.value > 0 ? `${s.value} · ` : ""}
                    {s.optionLabel}
                  </div>
                  {s.rationale && <div className="xs muted">{s.rationale}</div>}
                </div>
                {done ? (
                  <span className="badge badge-ok">
                    <Check size={11} /> Aplicado
                  </span>
                ) : (
                  <button className="btn btn-xs" onClick={() => c.applySuggestions(m.id, [s])}>
                    Aplicar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(!!m.actions?.length || canSave) && (
        <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
          {m.actions?.map((a) => (
            <button key={a.type + a.label} className="btn btn-xs btn-primary" onClick={() => c.runAction(a, m)}>
              {a.label}
            </button>
          ))}
          {canSave && !m.actions?.some((a) => a.type === "add_to_report") && (
            <button className="btn btn-xs" onClick={() => c.runAction({ type: "add_to_report", label: "" }, m)}>
              Salvar no relatório
            </button>
          )}
        </div>
      )}

      {m.kind !== "error" && m.kind !== "interview" && m.content.length > 40 && <PriorityTool m={m} />}

      {!!m.followUps?.length && (
        <div className="suggest" style={{ marginTop: 10 }}>
          {m.followUps.map((f) => (
            <button key={f} className="chip chip-sm" onClick={() => c.send(f)}>
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Transforma pergunta + resposta numa prioridade da empresa. */
function PriorityTool({ m }: { m: CopilotMessage }) {
  const c = useCopilot();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  if (m.priority_id)
    return (
      <div className="msg-tools">
        <span className="pin-done">
          <Pin size={12} /> Em Prioridades
        </span>
      </div>
    );

  if (!editing)
    return (
      <div className="msg-tools hover-only">
        <button
          className="pin-btn"
          onClick={() => {
            setTitle(defaultTitle(c.questionFor(m.id), m.content));
            setEditing(true);
          }}
          title="Salvar pergunta e resposta como prioridade da empresa"
        >
          <Pin size={12} /> Priorizar
        </button>
      </div>
    );

  async function save() {
    setSaving(true);
    try {
      const p = await c.savePriority(m.id, title);
      if (p) toast("Salvo em Prioridades");
      setEditing(false);
    } catch (e) {
      toast(friendlyError(e, "Não foi possível salvar"), "err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="pin-form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label className="xs muted" htmlFor={`pin-${m.id}`}>
        Nome da prioridade
      </label>
      <input id={`pin-${m.id}`} className="input input-sm" autoFocus value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-xs btn-ghost" onClick={() => setEditing(false)}>
          Cancelar
        </button>
        <button className="btn btn-xs btn-primary" disabled={saving || !title.trim()}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function defaultTitle(question: string | null, answer: string) {
  // Prefere o primeiro destaque da resposta; senão, a pergunta; senão, a 1ª frase.
  const bold = answer.match(/\*\*(.+?)\*\*/)?.[1];
  const base = bold || question || answer.split(/[.\n]/)[0];
  const t = base.replace(/[*#_`]/g, "").replace(/\s+/g, " ").trim().replace(/[.:]$/, "");
  return t.length > 90 ? `${t.slice(0, 87)}…` : t;
}

function HistoryView({ onBack }: { onBack: () => void }) {
  const c = useCopilot();
  const toast = useToast();
  return (
    <div className="copilot-msgs history">
      <button className="link-btn row" style={{ gap: 6, marginBottom: 12 }} onClick={onBack}>
        <ArrowLeft size={14} /> Voltar à conversa
      </button>
      {c.threadsLoading && (
        <div className="row muted small">
          <Spinner /> Carregando…
        </div>
      )}
      {!c.threadsLoading && !c.threads.length && <p className="small muted">Nenhuma conversa salva ainda. Tudo que você perguntar aqui fica guardado no histórico da empresa.</p>}
      <ul className="thread-list">
        {c.threads.map((t) => {
          const n = (t.messages || []).filter((m) => m.role === "user").length;
          const pins = (t.messages || []).filter((m) => m.priority_id).length;
          return (
            <li key={t.id} className={t.id === c.threadId ? "current" : ""}>
              <button className="thread-main" onClick={() => c.openThread(t.id)}>
                <span className="thread-title">{t.title}</span>
                <span className="xs muted">
                  {relTime(t.updated_at)} · {n} {n === 1 ? "pergunta" : "perguntas"}
                  {pins > 0 && (
                    <>
                      {" · "}
                      <Pin size={10} style={{ verticalAlign: -1 }} /> {pins}
                    </>
                  )}
                </span>
              </button>
              <button
                className="thread-del"
                aria-label="Apagar conversa"
                title="Apagar conversa"
                onClick={() => {
                  if (confirm("Apagar esta conversa do histórico? As prioridades salvas continuam."))
                    c.deleteThread(t.id).catch((e) => toast(friendlyError(e), "err"));
                }}
              >
                <Trash2 size={13} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
