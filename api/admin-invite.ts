// Vercel Function — POST /api/admin-invite  { email, full_name, role, organization_id }
// Só administradores. Usa a service role key (apenas no servidor) para
// convidar por e-mail; o trigger handle_new_user cria o perfil com papel e empresa.
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

export async function POST(request: Request) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return json(503, { error: "Supabase não configurado no servidor (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)." });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Não autenticado." });

  const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!who.ok) return json(401, { error: "Sessão inválida." });
  const { id } = (await who.json()) as { id: string };

  const svc = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
  const prof = await fetch(`${url}/rest/v1/profiles?id=eq.${id}&select=role`, { headers: svc });
  const rows = (await prof.json()) as { role: string }[];
  if (rows[0]?.role !== "admin") return json(403, { error: "Apenas administradores podem convidar usuários." });

  let body: { email?: string; full_name?: string; role?: string; organization_id?: string | null; password?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "JSON inválido." });
  }
  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { error: "E-mail inválido." });
  const role = ["admin", "consultor", "cliente"].includes(body.role || "") ? body.role : "cliente";
  if (role === "cliente" && !body.organization_id) return json(400, { error: "Usuário cliente precisa de uma empresa vinculada." });

  const meta = { full_name: body.full_name || "", role, organization_id: body.organization_id || "" };

  // Com senha provisória: cria o usuário já confirmado, sem depender de e-mail.
  if (body.password) {
    if (body.password.length < 8) return json(400, { error: "A senha provisória precisa de 8+ caracteres." });
    const cr = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers: svc,
      body: JSON.stringify({ email, password: body.password, email_confirm: true, user_metadata: meta }),
    });
    const out = (await cr.json().catch(() => ({}))) as { id?: string; msg?: string; message?: string; error_description?: string };
    if (!cr.ok) {
      const msg = out.msg || out.message || out.error_description || "Falha ao criar usuário.";
      return json(cr.status, { error: /already/i.test(msg) ? "Este e-mail já tem cadastro. Ajuste o papel e a empresa na lista de usuários." : msg });
    }
    return json(200, { ok: true, user_id: out.id, mode: "password" });
  }

  const redirect = encodeURIComponent(`${process.env.APP_URL || new URL(request.url).origin}/conta`);
  const inv = await fetch(`${url}/auth/v1/invite?redirect_to=${redirect}`, {
    method: "POST",
    headers: svc,
    body: JSON.stringify({ email, data: meta }),
  });
  const out = (await inv.json().catch(() => ({}))) as { id?: string; msg?: string; message?: string; error_description?: string };
  if (!inv.ok) {
    const msg = out.msg || out.message || out.error_description || "Falha ao convidar.";
    if (inv.status === 429 || /rate limit/i.test(msg)) return json(429, { error: "Limite de envio de e-mails do Supabase atingido. Use a opção de senha provisória ou configure um SMTP próprio." });
    return json(inv.status, { error: /already/i.test(msg) ? "Este e-mail já tem cadastro. Ajuste o papel e a empresa na lista de usuários." : msg });
  }
  return json(200, { ok: true, user_id: out.id });
}
