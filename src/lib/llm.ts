import { supabase } from "./supabase";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function callSkill<T = unknown>(skill: string, input: unknown, messages?: ChatTurn[]): Promise<{ output: T; model: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  let resp: Response;
  try {
    resp = await fetch("/api/llm", { method: "POST", headers, body: JSON.stringify({ skill, input, messages }) });
  } catch {
    throw new Error("Não foi possível conectar à API de IA.");
  }
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data) {
    if (resp.status === 404) throw new Error("API de IA indisponível neste ambiente (rode com `npm run dev` ou na Vercel).");
    throw new Error(data?.error || `Falha na IA (${resp.status}).`);
  }
  return { output: data.output as T, model: data.model };
}
