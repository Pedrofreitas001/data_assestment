// Converte qualquer erro (Supabase/PostgREST, fetch, Error) em mensagem clara.
const SETUP = "Rode o arquivo supabase/setup_completo.sql no SQL Editor do Supabase.";

export function friendlyError(e: unknown, fallback = "Não foi possível concluir. Tente novamente."): string {
  if (!e) return fallback;
  const o = e as { message?: string; code?: string; details?: string; hint?: string };
  const msg = String(o.message || (typeof e === "string" ? e : "") || "");
  const code = String(o.code || "");
  const low = msg.toLowerCase();

  if (code === "42501" || low.includes("row-level security") || low.includes("permission denied")) {
    const table = msg.match(/(?:for )?table ["']?(?:public\.)?(\w+)["']?/i)?.[1];
    return `Sem permissão para esta ação${table ? ` (tabela ${table})` : ""}. Sua conta precisa ser admin/consultor ou estar vinculada à empresa.`;
  }
  if (code === "23503" || low.includes("violates foreign key"))
    return "Não foi possível salvar: o registro relacionado ainda não existe. Tente de novo em alguns segundos.";
  const col = msg.match(/column ['"]?([\w.]+)['"]? (?:of relation \S+ )?does not exist/i) || msg.match(/find the '([\w]+)' column/i);
  if (code === "PGRST204" || code === "42703" || col)
    return `Banco de dados desatualizado${col ? ` (falta a coluna ${col[1]})` : ""}. ${SETUP}`;
  const tbl = msg.match(/relation ['"]?([\w.]+)['"]? does not exist/i) || msg.match(/find the table '([\w.]+)'/i);
  if (code === "PGRST205" || code === "42P01" || tbl) return `Banco de dados incompleto${tbl ? ` (falta a tabela ${tbl[1]})` : ""}. ${SETUP}`;
  if (code === "42883" || low.includes("function") && low.includes("does not exist")) return `Função do banco ausente. ${SETUP}`;
  if (low.includes("jwt expired") || low.includes("invalid jwt")) return "Sessão expirada. Saia e entre novamente.";
  if (low.includes("failed to fetch") || low.includes("networkerror")) return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
  return msg || fallback;
}

/** Erro com mensagem amigável preservando o código original. */
export function toError(e: unknown, fallback?: string): Error {
  const err = new Error(friendlyError(e, fallback));
  (err as Error & { code?: string }).code = (e as { code?: string })?.code;
  return err;
}
