import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp, Check, MessageCircleQuestion, RotateCcw, X } from "lucide-react";
import { useCopilot, type CopilotMessage } from "../context/copilot";
import { miniMarkdown } from "../lib/format";
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
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const page = loc.pathname.split("/")[1] || "";
  const onResult = loc.pathname.endsWith("/resultado");

  // Chaves obrigatórias: scrollIntoView retorna uma Promise nos navegadores novos,
  // e o React trataria esse retorno como função de limpeza do efeito.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [c.messages, c.busy, c.isOpen]);
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
            {c.interview ? `Entrevista · ${c.interview.title}` : "Explica, interpreta e redige com você"}
          </div>
        </div>
        {c.messages.length > 0 && (
          <button className="side-btn" onClick={c.reset} title="Nova conversa" style={{ color: "#bbb" }}>
            <RotateCcw size={15} />
          </button>
        )}
        <button className="side-btn" onClick={c.close} aria-label="Fechar" style={{ color: "#fff" }}>
          <X size={18} />
        </button>
      </header>

      {c.interview && (
        <div className="interview-bar">
          <span>
            <b>Modo entrevista</b> — responda com suas palavras; eu marco as opções para você revisar.
          </span>
          <button className="link-btn" onClick={c.stopInterview}>
            Encerrar
          </button>
        </div>
      )}

      <div className="copilot-msgs">
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
      <label className="copilot-foot">
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
