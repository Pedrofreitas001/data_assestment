import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { useCopilot } from "../context/copilot";
import { AiMark } from "./ui";

/** Entrada destacada para conversar com o assistente a partir de qualquer página. */
export default function AskBar({ title, placeholder, chips }: { title: string; placeholder: string; chips: string[] }) {
  const copilot = useCopilot();
  const [text, setText] = useState("");
  const go = (t: string) => {
    if (!t.trim()) return;
    copilot.ask(t);
    setText("");
  };
  return (
    <section className="card askbar no-print">
      <div className="row" style={{ gap: 12, marginBottom: 14 }}>
        <AiMark />
        <div>
          <div style={{ fontWeight: 600 }}>{title}</div>
          <div className="small muted">Explica conceitos, interpreta resultados e redige textos para o relatório.</div>
        </div>
      </div>
      <form
        className="askbar-input"
        onSubmit={(e) => {
          e.preventDefault();
          go(text);
        }}
      >
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label="Pergunta ao assistente" />
        <button className="btn btn-primary btn-icon" disabled={!text.trim()} aria-label="Perguntar">
          <ArrowUp size={17} />
        </button>
      </form>
      <div className="suggest" style={{ marginTop: 12 }}>
        {chips.map((c) => (
          <button key={c} className="chip chip-sm" onClick={() => go(c)}>
            {c}
          </button>
        ))}
      </div>
    </section>
  );
}
