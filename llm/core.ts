// =====================================================================
// Núcleo LLM — carrega skills (markdown), chama o OpenRouter e devolve
// JSON/texto. Roda em Node (Vercel Function e middleware do Vite dev).
// Nenhuma dependência externa: só fetch + fs.
// =====================================================================
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface SkillMeta {
  name: string;
  description: string;
  output: "json" | "text";
  temperature: number;
  max_tokens: number;
  body: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface RunInput {
  skill: string;
  input: unknown;
  messages?: ChatTurn[];
}

export interface RunResult {
  skill: string;
  model: string;
  output: unknown;
  usage?: unknown;
}

export class LlmError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

const ROOT = join(process.cwd(), "llm");
let cache: { base: string; knowledge: string; skills: Map<string, SkillMeta> } | null = null;

function parseFrontmatter(raw: string): SkillMeta {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta: Record<string, string> = {};
  if (m) for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return {
    name: meta.name || "",
    description: meta.description || "",
    output: meta.output === "json" ? "json" : "text",
    temperature: Number(meta.temperature ?? 0.2),
    max_tokens: Number(meta.max_tokens ?? 1500),
    body: (m ? m[2] : raw).trim(),
  };
}

function load() {
  if (cache) return cache;
  const skillsDir = join(ROOT, "skills");
  const skills = new Map<string, SkillMeta>();
  for (const f of readdirSync(skillsDir)) {
    if (!f.endsWith(".md") || f.startsWith("_")) continue;
    const s = parseFrontmatter(readFileSync(join(skillsDir, f), "utf8"));
    skills.set(s.name || f.replace(/\.md$/, ""), s);
  }
  cache = {
    base: readFileSync(join(skillsDir, "_base.md"), "utf8").trim(),
    knowledge: readFileSync(join(ROOT, "knowledge", "moulis-framework.md"), "utf8").trim(),
    skills,
  };
  return cache;
}

export function listSkills() {
  return [...load().skills.values()].map(({ name, description, output }) => ({ name, description, output }));
}

// ---------------------------------------------------------------------
// Governança: nada que pareça segredo sai do servidor para o provedor.
// ---------------------------------------------------------------------
const SECRET_RE: [RegExp, string][] = [
  [/sk-[a-z0-9-]{16,}/gi, "[SEGREDO_REMOVIDO]"],
  [/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]*/g, "[JWT_REMOVIDO]"],
  [/AKIA[0-9A-Z]{16}/g, "[AWS_KEY_REMOVIDA]"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[CHAVE_PRIVADA_REMOVIDA]"],
  [/\b(senha|password|passwd|pwd|secret|token|apikey|api_key)(\s*[:=]\s*)\S{4,}/gi, "$1$2[REMOVIDO]"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g, "[TOKEN_REMOVIDO]"],
];

export function redactSecrets(text: string): { text: string; redacted: boolean } {
  let out = text;
  for (const [re, rep] of SECRET_RE) out = out.replace(re, rep);
  return { text: out, redacted: out !== text };
}

function tryJson(text: string): unknown {
  try {
    const v = extractJson(text);
    return v && typeof v === "object" ? v : undefined;
  } catch {
    return undefined;
  }
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new LlmError("O modelo não retornou JSON válido.", 502);
  return JSON.parse(candidate.slice(start, end + 1));
}

async function callOpenRouter(model: string, body: Record<string, unknown>) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new LlmError("OPENROUTER_API_KEY não configurada no servidor.", 503);
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || "https://moulis.app",
      "X-Title": "Moulis Data Maturity",
    },
    body: JSON.stringify({ model, ...body }),
  });
  const data = (await resp.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string | null; reasoning?: string | null } }[];
    error?: { message?: string };
    usage?: unknown;
    model?: string;
  };
  if (!resp.ok) throw new LlmError(data.error?.message || `OpenRouter respondeu ${resp.status}`, resp.status === 429 ? 429 : 502);
  if (data.error?.message) throw new LlmError(`OpenRouter: ${data.error.message}`, 502);
  const msg = data.choices?.[0]?.message;
  const content = (msg?.content || "").trim() || (msg?.reasoning || "").trim();
  if (!content) throw new LlmError(`O modelo ${model} retornou uma resposta vazia. Aumente o limite ou troque OPENROUTER_MODEL.`, 502);
  return { content, usage: data.usage, model: data.model || model };
}

export async function runSkill({ skill, input, messages }: RunInput): Promise<RunResult> {
  const { base, knowledge, skills } = load();
  const s = skills.get(skill);
  if (!s) throw new LlmError(`Skill desconhecida: ${skill}`, 400);

  const system = [base, "## Base de conhecimento\n" + knowledge, s.body].join("\n\n---\n\n");
  const payload = redactSecrets(JSON.stringify(input ?? {}, null, 1)).text;

  const chat: { role: string; content: string }[] = [{ role: "system", content: system }];
  if (messages?.length) {
    chat.push({ role: "user", content: `Contexto da tela (JSON):\n${payload}` });
    chat.push({ role: "assistant", content: "Entendido. Estou com o contexto da empresa e da tela." });
    for (const m of messages.slice(-12)) chat.push({ role: m.role, content: redactSecrets(m.content).text.slice(0, 4000) });
  } else {
    chat.push({ role: "user", content: `Entrada (JSON):\n${payload}` });
  }

  const primary = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5";
  const fallback = process.env.OPENROUTER_FALLBACK_MODEL;
  const body: Record<string, unknown> = { messages: chat, temperature: s.temperature, max_tokens: s.max_tokens };
  if (s.output === "json") body.response_format = { type: "json_object" };

  let res;
  try {
    res = await callOpenRouter(primary, body);
  } catch (e) {
    if (!fallback || (e instanceof LlmError && e.status === 503)) throw e;
    res = await callOpenRouter(fallback, body);
  }

  let output: unknown = res.content;
  if (s.output === "json") {
    let parsed = tryJson(res.content);
    if (parsed === undefined) {
      // Alguns modelos ignoram o pedido de JSON: tenta uma vez de novo, mais explícito.
      console.warn(`[llm] ${skill}: resposta não-JSON de ${res.model}: ${res.content.slice(0, 160).replace(/\s+/g, " ")}`);
      const retry = await callOpenRouter(res.model, {
        ...body,
        messages: [...chat, { role: "assistant", content: res.content }, { role: "user", content: "Reescreva a resposta anterior SOMENTE como um objeto JSON válido, no formato pedido nas instruções, sem texto fora do JSON." }],
      }).catch(() => null);
      if (retry) parsed = tryJson(retry.content);
    }
    if (parsed === undefined) {
      // Último recurso: skills conversacionais usam o texto como resposta.
      if (skill === "copilot") parsed = { reply: res.content, follow_ups: [], actions: [] };
      else if (skill === "interview") parsed = { reply: res.content, suggestions: [], next_question: null, section_complete: false };
      else throw new LlmError("O modelo não retornou uma resposta no formato esperado. Tente novamente ou troque OPENROUTER_MODEL.", 502);
    }
    output = parsed;
  }
  const keys = output && typeof output === "object" ? Object.keys(output as object).join(",") : typeof output;
  console.log(`[llm] ${skill} ok · modelo=${res.model} · chaves=${keys} · ${res.content.length} chars`);
  return { skill, model: res.model, output, usage: res.usage };
}

// ---------------------------------------------------------------------
// Autorização: valida o JWT do Supabase chamando /auth/v1/user.
// ---------------------------------------------------------------------
export async function authorize(authHeader: string | null): Promise<{ userId: string | null }> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    if (process.env.LLM_ALLOW_ANONYMOUS === "true") return { userId: null };
    throw new LlmError("IA bloqueada: sem Supabase configurado não há login para proteger a API. Em desenvolvimento, defina LLM_ALLOW_ANONYMOUS=true no .env.", 401);
  }
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) throw new LlmError("Faça login para usar a IA.", 401);
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new LlmError("Sessão inválida ou expirada.", 401);
  const u = (await r.json()) as { id?: string };
  return { userId: u.id ?? null };
}

// Limite simples por usuário (best-effort por instância quente).
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) throw new LlmError("Muitas requisições. Aguarde um minuto.", 429);
  arr.push(now);
  hits.set(key, arr);
}

/** Handler Web-standard compartilhado por Vercel e Vite dev. */
export async function handleLlmRequest(request: Request): Promise<Response> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
  try {
    if (request.method === "GET")
      return json(200, {
        skills: listSkills(),
        configured: !!process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5 (padrão)",
        fallback_model: process.env.OPENROUTER_FALLBACK_MODEL || null,
        supabase_auth: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      });
    if (request.method !== "POST") return json(405, { error: "Método não permitido" });
    const raw = await request.text();
    if (raw.length > 120_000) return json(413, { error: "Entrada muito grande." });
    const { userId } = await authorize(request.headers.get("authorization"));
    rateLimit(userId || request.headers.get("x-forwarded-for") || "anon");
    const body = JSON.parse(raw) as RunInput;
    const result = await runSkill(body);
    return json(200, result);
  } catch (e) {
    const status = e instanceof LlmError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Erro inesperado";
    console.error(`[llm] erro ${status}: ${message}`);
    return json(status, { error: message });
  }
}
