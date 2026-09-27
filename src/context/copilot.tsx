import { friendlyError } from "../lib/errors";
// =====================================================================
// Assistente Moulis — estado global do copiloto.
// Páginas informam o que o usuário está vendo (setFocus), registram as
// ações que o assistente pode oferecer (registerHandlers) e disparam
// chamadas proativas (nudge). O painel (components/Copilot) só desenha.
// =====================================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { callSkill, type ChatTurn } from "../lib/llm";
import { orgSnapshot, assessmentForLlm } from "../lib/snapshot";
import { store } from "../lib/store";
import { looksLikeSecret } from "../model/kpiOptions";
import { normCopilot, normInterview } from "../lib/sanitize";
import type { Assessment } from "../model/types";
import { useAuth } from "./auth";
import { useOrg } from "./org";

export interface CopilotAction {
  type: string;
  label: string;
  payload?: unknown;
}

export interface AnswerSuggestion {
  id: string;
  value: number;
  confidence?: "alta" | "media" | "baixa";
  rationale?: string;
  evidence_quote?: string;
  prompt?: string;
  optionLabel?: string;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Texto completo enviado ao modelo quando difere do exibido. */
  llm?: string;
  followUps?: string[];
  actions?: CopilotAction[];
  suggestions?: AnswerSuggestion[];
  applied?: string[];
  kind?: "nudge" | "interview" | "error";
}

export interface InterviewSection {
  key: string;
  title: string;
  desc: string;
  questions: { id: string; prompt: string; options: { v: number; label: string }[] }[];
}

export interface Nudge {
  id: string;
  text: string;
  actions?: CopilotAction[];
  followUps?: string[];
  /** Ignora o intervalo mínimo entre chamadas (ex.: resposta a um clique). */
  urgent?: boolean;
}

type Handler = (payload?: unknown) => void | Promise<void>;

interface CopilotState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  messages: CopilotMessage[];
  busy: boolean;
  send: (text: string, display?: string) => Promise<void>;
  ask: (text: string, display?: string) => void;
  runAction: (a: CopilotAction, msg?: CopilotMessage) => Promise<void>;
  applySuggestions: (msgId: string, items: AnswerSuggestion[]) => Promise<void>;
  bubble: Nudge | null;
  dismissBubble: () => void;
  acceptBubble: () => void;
  nudge: (n: Nudge) => void;
  setFocus: (f: Record<string, unknown> | null) => void;
  registerHandlers: (h: Record<string, Handler>) => () => void;
  availableActions: string[];
  interview: InterviewSection | null;
  startInterview: (s: InterviewSection, getAnswers: () => Record<string, number>, context?: unknown) => void;
  stopInterview: () => void;
  proactive: boolean;
  setProactive: (v: boolean) => void;
  reset: () => void;
}

const Ctx = createContext<CopilotState>(null as never);
const uid = () => Math.random().toString(36).slice(2, 10);
const COOLDOWN_MS = 40_000;

const GLOBAL_ACTIONS = ["open_report", "continue_assessment"];

export function CopilotProvider({ children }: { children: ReactNode }) {
  const { org } = useOrg();
  const { profile } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem("moulis:copilot-open") === "1";
    } catch {
      return false;
    }
  });
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [bubble, setBubble] = useState<Nudge | null>(null);
  const bubbleRef = useRef<Nudge | null>(null);
  bubbleRef.current = bubble;
  const [interview, setInterview] = useState<InterviewSection | null>(null);
  const [proactive, setProactiveState] = useState(() => {
    try {
      return localStorage.getItem("moulis:copilot-proactive") !== "0";
    } catch {
      return true;
    }
  });
  const [handlerKeys, setHandlerKeys] = useState<string[]>([]);

  const focus = useRef<Record<string, unknown> | null>(null);
  const handlers = useRef<Record<string, Handler>>({});
  const seen = useRef<Set<string>>(new Set());
  const lastNudge = useRef(0);
  const interviewRef = useRef<{ section: InterviewSection; getAnswers: () => Record<string, number>; context?: unknown; transcript: ChatTurn[] } | null>(null);
  const messagesRef = useRef<CopilotMessage[]>([]);
  messagesRef.current = messages;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const push = useCallback((m: Omit<CopilotMessage, "id">) => {
    const msg = { ...m, id: uid() };
    setMessages((xs) => [...xs, msg]);
    return msg;
  }, []);

  const persistOpen = (v: boolean) => {
    setIsOpen(v);
    try {
      localStorage.setItem("moulis:copilot-open", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const open = useCallback(() => {
    persistOpen(true);
    setBubble(null);
  }, []);
  const close = useCallback(() => persistOpen(false), []);

  const setProactive = (v: boolean) => {
    setProactiveState(v);
    try {
      localStorage.setItem("moulis:copilot-proactive", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  // --------------------------------------------------------------- nudges
  const nudge = useCallback(
    (n: Nudge) => {
      if (!proactive || seen.current.has(n.id)) return;
      const now = Date.now();
      if (!n.urgent && now - lastNudge.current < COOLDOWN_MS) return;
      seen.current.add(n.id);
      lastNudge.current = now;
      if (isOpenRef.current) push({ role: "assistant", content: n.text, actions: n.actions, followUps: n.followUps, kind: "nudge" });
      else setBubble(n);
    },
    [proactive, push],
  );

  const dismissBubble = () => setBubble(null);
  const acceptBubble = () => {
    if (bubble) push({ role: "assistant", content: bubble.text, actions: bubble.actions, followUps: bubble.followUps, kind: "nudge" });
    open();
  };

  // Boas-vindas: uma vez por sessão, depois que a empresa carrega.
  useEffect(() => {
    if (!profile || !org) return;
    let key = "moulis:welcomed";
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      key = "";
    }
    const t = setTimeout(() => {
      const first = (profile.full_name || "").split(/\s+/)[0];
      const hello = `Olá${first ? `, ${first}` : ""}! Sou o assistente da Moulis.`;
      // Se a página já chamou o usuário, a saudação entra junto com esse chamado.
      const current = bubbleRef.current;
      if (current) setBubble({ ...current, text: `${hello} ${current.text}` });
      else
        nudge({
          id: "welcome",
          urgent: true,
          text: `${hello} Explico conceitos, conduzo o diagnóstico e redijo o relatório de **${org.name}**.`,
          followUps: ["Como funciona o diagnóstico?", "O que é maturidade de dados?", "Onde estamos hoje?"],
        });
      try {
        if (key) sessionStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [profile, org, nudge]);

  // ------------------------------------------------------------ handlers
  const registerHandlers = useCallback((h: Record<string, Handler>) => {
    const sync = () => {
      const keys = Object.keys(handlers.current).sort();
      setHandlerKeys((prev) => (prev.join() === keys.join() ? prev : keys));
    };
    Object.assign(handlers.current, h);
    sync();
    return () => {
      for (const k of Object.keys(h)) if (handlers.current[k] === h[k]) delete handlers.current[k];
      sync();
    };
  }, []);

  const setFocus = useCallback((f: Record<string, unknown> | null) => {
    focus.current = f;
  }, []);

  const availableActions = useMemo(() => [...GLOBAL_ACTIONS, ...handlerKeys, "add_to_report"].filter((k, i, a) => a.indexOf(k) === i), [handlerKeys]);

  // --------------------------------------------------------------- chat
  const chat = useCallback(
    async (turns: ChatTurn[]) => {
      // O contexto da empresa é opcional: se o banco falhar, o chat segue funcionando.
      const snapshot = await orgSnapshot(org).catch((e) => ({ empresa: org ? { nome: org.name } : null, aviso: friendlyError(e) }));
      const f = focus.current || {};
      const report = (f.assessment as Assessment | undefined) ? assessmentForLlm(f.assessment as Assessment) : undefined;
      const { assessment: _a, ...pageFocus } = f;
      void _a;
      const { output: raw } = await callSkill<unknown>(
        "copilot",
        { page: { path: loc.pathname, ...pageFocus, acoes_disponiveis: availableActions }, snapshot, report, usuario: profile?.full_name },
        turns,
      );
      const output = normCopilot(raw);
      const valid = output.actions.filter((a) => availableActions.includes(a.type) && (a.type !== "add_to_report" || handlers.current.add_to_report));
      push({ role: "assistant", content: output.reply, followUps: output.follow_ups, actions: valid.slice(0, 2) });
    },
    [org, loc.pathname, availableActions, profile, push],
  );

  const interviewTurn = useCallback(
    async (userText: string) => {
      const iv = interviewRef.current!;
      iv.transcript.push({ role: "user", content: userText });
      const { output: raw } = await callSkill<unknown>("interview", {
        section: iv.section,
        transcript: iv.transcript,
        current_answers: iv.getAnswers(),
        context: iv.context,
      });
      const output = normInterview(raw);
      const qs = iv.section.questions;
      const suggestions = output.suggestions
        .filter((s) => { const q = qs.find((x) => x.id === s.id); return q && (s.value === 0 || q.options.some((o) => o.v === s.value)); })
        .map((s) => {
          const q = qs.find((x) => x.id === s.id)!;
          return { ...s, prompt: q.prompt, optionLabel: s.value === 0 ? "Não sei" : q.options.find((o) => o.v === s.value)?.label };
        });
      const text = [output.reply, output.next_question].filter(Boolean).join("\n\n");
      iv.transcript.push({ role: "assistant", content: text });
      const actions: CopilotAction[] = [];
      if (output.section_complete && handlers.current.next_section) actions.push({ type: "next_section", label: "Ir para a próxima seção" });
      push({ role: "assistant", content: text, suggestions, kind: "interview", actions });
      if (suggestions.length && handlers.current.preview_answers) await handlers.current.preview_answers(suggestions);
    },
    [push],
  );

  const send = useCallback(
    async (text: string, display?: string) => {
      const t = text.trim();
      if (!t || busy) return;
      if (looksLikeSecret(t)) {
        push({ role: "user", content: "•••• (mensagem bloqueada)" });
        push({ role: "assistant", content: "**Isso parece uma senha ou token** — não enviei. Se foi exposto, revogue/rotacione e guarde num cofre de senhas.", kind: "error" });
        return;
      }
      push({ role: "user", content: display || t, llm: display ? t : undefined });
      setBusy(true);
      try {
        if (interviewRef.current) await interviewTurn(t);
        else {
          const turns: ChatTurn[] = [...messagesRef.current, { role: "user", content: t } as CopilotMessage]
            .filter((m) => m.kind !== "error")
            .map((m) => ({ role: m.role, content: m.llm || m.content }));
          await chat(turns);
        }
      } catch (e) {
        push({ role: "assistant", content: friendlyError(e, "Não consegui responder agora."), kind: "error" });
      } finally {
        setBusy(false);
      }
    },
    [busy, chat, interviewTurn, push],
  );

  const ask = useCallback(
    (text: string, display?: string) => {
      open();
      setTimeout(() => send(text, display), 50);
    },
    [open, send],
  );

  // ------------------------------------------------------------ interview
  const startInterview = useCallback(
    (section: InterviewSection, getAnswers: () => Record<string, number>, context?: unknown) => {
      open();
      const answered = getAnswers();
      const pending = section.questions.filter((q) => answered[q.id] === undefined);
      const first = (pending[0] || section.questions[0]).prompt;
      const opener = `**${section.title}** — responda com suas palavras.\n\n${first}`;
      interviewRef.current = { section, getAnswers, context, transcript: [{ role: "assistant", content: opener }] };
      setInterview(section);
      push({ role: "assistant", content: opener, kind: "interview" });
    },
    [open, push],
  );

  const stopInterview = useCallback(() => {
    if (interviewRef.current) push({ role: "assistant", content: "Entrevista encerrada. Continuo por aqui para qualquer dúvida.", kind: "nudge" });
    interviewRef.current = null;
    setInterview(null);
  }, [push]);

  // -------------------------------------------------------------- actions
  const runAction = useCallback(
    async (a: CopilotAction, msg?: CopilotMessage) => {
      const f = focus.current || {};
      if (a.type === "open_report" || a.type === "continue_assessment") {
        // Fora do diagnóstico, usa o diagnóstico mais recente da empresa.
        let assessmentId = (f.assessment_id as string) || (f.latest_assessment_id as string) || "";
        if (!assessmentId && org) assessmentId = (await store.list("assessments", { organization_id: org.id }).catch(() => []))[0]?.id || "";
        if (!assessmentId) return nav("/assessments");
        return nav(a.type === "open_report" ? `/assessments/${assessmentId}/resultado` : `/assessments/${assessmentId}`);
      }
      if (a.type === "add_to_report") {
        const h = handlers.current.add_to_report;
        if (h && msg) await h({ body: msg.content });
        return;
      }
      if (a.type === "ask") return ask(String(a.payload), a.label);
      const h = handlers.current[a.type];
      if (h) await h(a.payload);
      else push({ role: "assistant", content: "Essa ação não está disponível nesta tela. Abra o diagnóstico ou o relatório e tente de novo.", kind: "nudge" });
    },
    [nav, ask, org, push],
  );

  const applySuggestions = useCallback(async (msgId: string, items: AnswerSuggestion[]) => {
    const h = handlers.current.apply_answers;
    if (!h) return;
    await h(items);
    setMessages((xs) => xs.map((m) => (m.id === msgId ? { ...m, applied: [...(m.applied || []), ...items.map((i) => i.id)] } : m)));
  }, []);

  // Sai da entrevista se o usuário sair do diagnóstico.
  useEffect(() => {
    if (interviewRef.current && !loc.pathname.startsWith("/assessments/")) {
      interviewRef.current = null;
      setInterview(null);
    }
  }, [loc.pathname]);

  const reset = () => {
    interviewRef.current = null;
    setInterview(null);
    setMessages([]);
  };

  const value: CopilotState = {
    isOpen, open, close, messages, busy, send, ask, runAction, applySuggestions, bubble, dismissBubble, acceptBubble, nudge,
    setFocus, registerHandlers, availableActions, interview, startInterview, stopInterview, proactive, setProactive, reset,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCopilot = () => useContext(Ctx);

/** Atalho para páginas: define o foco enquanto a página estiver montada. */
export function useCopilotFocus(f: Record<string, unknown> | null, deps: unknown[]) {
  const { setFocus } = useCopilot();
  useEffect(() => {
    setFocus(f);
    return () => setFocus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
