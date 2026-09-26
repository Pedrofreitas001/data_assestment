import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp, X } from "lucide-react";
import { useOrg } from "../context/org";
import { callSkill, type ChatTurn } from "../lib/llm";
import { orgSnapshot } from "../lib/snapshot";
import { miniMarkdown } from "../lib/format";
import { looksLikeSecret } from "../model/kpiOptions";
import { AiMark, Spinner } from "./ui";

const PAGE_NAMES: Record<string, string> = {
  "": "Início",
  assessments: "Diagnóstico de maturidade",
  glossario: "Glossário de KPIs",
  framework: "Framework / manual",
  admin: "Clientes",
};

const SUGGESTIONS: Record<string, string[]> = {
  "": ["O que mais trava o próximo nível?", "Resuma o diagnóstico em 3 frases"],
  assessments: ["Como diferencio 'Parcial' de 'Sim com controle'?", "O que é a tabela DIM de-para?"],
  glossario: ["Quais KPIs uma PME de varejo deve ter?", "Como escrever premissas de um KPI?"],
  framework: ["Por que o owner limita o nível?", "Explique bronze, prata e ouro"],
  admin: ["Como comparar clientes na carteira?"],
};

export default function Copilot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const { org } = useOrg();
  const loc = useLocation();
  const endRef = useRef<HTMLDivElement>(null);
  const page = loc.pathname.split("/")[1] || "";

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    if (looksLikeSecret(t)) {
      setMsgs((m) => [...m, { role: "user", content: "•••• (mensagem bloqueada)" }, { role: "assistant", content: "**Isso parece uma senha ou token.** Não enviei a mensagem. Se esse segredo foi compartilhado em algum lugar, revogue/rotacione e guarde-o num cofre (1Password, Bitwarden). Registre apenas *onde* ele está guardado e *quem* responde por ele." }]);
      setInput("");
      return;
    }
    const next: ChatTurn[] = [...msgs, { role: "user", content: t }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const snapshot = await orgSnapshot(org);
      const { output } = await callSkill<string>("copilot", { page: PAGE_NAMES[page] ?? page, snapshot }, next);
      setMsgs((m) => [...m, { role: "assistant", content: String(output) }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "Erro ao consultar a IA."}` }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button className="fab no-print" onClick={() => setOpen(true)} aria-label="Abrir copiloto de IA">
        <AiMark size={13} /> <span className="fab-label">Copiloto</span>
      </button>
    );

  return (
    <div className="copilot no-print" role="dialog" aria-label="Copiloto Moulis">
      <div className="copilot-head">
        <AiMark />
        <div className="grow">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Copiloto Moulis</div>
          <div className="xs" style={{ color: "#a8a8a2" }}>
            {org?.name ?? "Sem empresa"} · {PAGE_NAMES[page] ?? "—"}
          </div>
        </div>
        <button className="side-btn" onClick={() => setOpen(false)} aria-label="Fechar" style={{ color: "#fff" }}>
          <X size={18} />
        </button>
      </div>
      <div className="copilot-msgs">
        {!msgs.length && (
          <div className="stack" style={{ gap: 12 }}>
            <div className="msg msg-ai">
              <p>
                Olá! Conheço o framework Moulis e os dados de <b>{org?.name ?? "sua empresa"}</b>. Posso explicar perguntas do diagnóstico, interpretar resultados e ajudar no glossário de KPIs.
              </p>
            </div>
            <div className="suggest">
              {(SUGGESTIONS[page] ?? SUGGESTIONS[""]).map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="msg msg-user">
              {m.content}
            </div>
          ) : (
            <div key={i} className="msg msg-ai" dangerouslySetInnerHTML={{ __html: miniMarkdown(m.content) }} />
          ),
        )}
        {busy && (
          <div className="msg msg-ai row">
            <Spinner /> <span className="muted small">Analisando…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="copilot-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte sobre dados, KPIs, governança…" aria-label="Mensagem" />
        <button className="btn btn-primary btn-icon" disabled={busy || !input.trim()} aria-label="Enviar">
          <ArrowUp size={17} />
        </button>
      </form>
    </div>
  );
}
