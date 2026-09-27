import { useState } from "react";
import { MailPlus, Users } from "lucide-react";
import { useAuth } from "../context/auth";
import { useOrg } from "../context/org";
import { useToast } from "../context/toast";
import { useRows } from "../lib/useRows";
import { supabase, IS_DEMO } from "../lib/supabase";
import { fmtDate, initials } from "../lib/format";
import type { Profile, Role } from "../model/types";
import { Empty, Field, LoadingPage, PageHead, Spinner } from "../components/ui";

const ROLES: { key: Role; label: string; hint: string }[] = [
  { key: "admin", label: "Admin (gestora)", hint: "Tudo, inclusive usuários" },
  { key: "consultor", label: "Consultor", hint: "Todos os clientes" },
  { key: "cliente", label: "Cliente", hint: "Só a própria empresa" },
];

export default function AdminUsers({ embedded }: { embedded?: boolean }) {
  const { isAdmin, profile: me } = useAuth();
  const { orgs } = useOrg();
  const toast = useToast();
  const users = useRows("profiles", null, { all: true });
  const [form, setForm] = useState({ email: "", full_name: "", role: "cliente" as Role, organization_id: "", password: "" });
  const [busy, setBusy] = useState(false);

  async function updateUser(p: Profile, patch: Partial<Profile>) {
    if (IS_DEMO) return toast("No modo demonstração não há usuários reais.", "err");
    try {
      await users.save({ ...p, ...patch });
      toast("Usuário atualizado");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "err");
    }
  }

  async function invite() {
    if (IS_DEMO) return toast("Configure o Supabase para convidar usuários.", "err");
    setBusy(true);
    try {
      const { data } = await supabase!.auth.getSession();
      const r = await fetch("/api/admin-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ ...form, organization_id: form.organization_id || null, password: form.password || undefined }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(out.error || "Falha no convite");
      toast(form.password ? `Acesso criado para ${form.email} — envie a senha provisória por um canal seguro` : `Convite enviado para ${form.email}`);
      setForm({ email: "", full_name: "", role: "cliente", organization_id: "", password: "" });
      setTimeout(() => users.reload(), 800);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "err");
    } finally {
      setBusy(false);
    }
  }

  if (users.loading) return <LoadingPage />;

  return (
    <>
      {!embedded && <PageHead eyebrow="Consultoria" title="Usuários" />}
      <p className="small muted" style={{ marginTop: 0, marginBottom: 16 }}>Clientes enxergam apenas a própria empresa. Consultores e a gestora veem toda a carteira.</p>

      <div className="grid g-main-side">
        <div className="card">
          {!users.rows.length ? (
            <Empty icon={<Users size={20} />} title="Nenhum usuário" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Papel</th>
                    <th>Empresa</th>
                    <th>Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {users.rows.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="row">
                          <span className="avatar" style={{ background: "var(--brand)", width: 30, height: 30, fontSize: 11 }}>
                            {initials(u.full_name || u.email)}
                          </span>
                          <div>
                            <div className="cell-title">{u.full_name || "—"}</div>
                            <div className="cell-sub">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select className="select" style={{ height: 34, paddingTop: 0, paddingBottom: 0 }} value={u.role} disabled={!isAdmin || u.id === me?.id} onChange={(e) => updateUser(u, { role: e.target.value as Role })}>
                          {ROLES.map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="select" style={{ height: 34, paddingTop: 0, paddingBottom: 0 }} value={u.organization_id || ""} disabled={!isAdmin} onChange={(e) => updateUser(u, { organization_id: e.target.value || null })}>
                          <option value="">— nenhuma —</option>
                          {orgs.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="small muted nowrap">{fmtDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card card-pad stack">
          <div className="row" style={{ gap: 10 }}>
            <MailPlus size={18} />
            <h3 className="card-title">Convidar usuário</h3>
          </div>
          {!isAdmin ? (
            <p className="small muted">Apenas a gestora (admin) pode convidar usuários.</p>
          ) : (
            <>
              <Field label="E-mail">
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Nome">
                <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <Field label="Papel" hint={ROLES.find((r) => r.key === form.role)?.hint}>
                <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                  {ROLES.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              {form.role === "cliente" && (
                <Field label="Empresa">
                  <select className="select" value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value })}>
                    <option value="">Selecione…</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Senha provisória (opcional)" hint="Preencha para criar o acesso na hora, sem depender de e-mail. A pessoa troca a senha em “Conta”.">
                <input className="input" type="text" autoComplete="off" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="mín. 8 caracteres" />
              </Field>
              <button
                className="btn btn-primary"
                disabled={busy || !form.email || (form.role === "cliente" && !form.organization_id) || (!!form.password && form.password.length < 8)}
                onClick={invite}
              >
                {busy ? <Spinner /> : form.password ? "Criar acesso" : "Enviar convite por e-mail"}
              </button>
              <p className="xs muted" style={{ margin: 0 }}>
                {form.password ? "O usuário já entra confirmado. Envie a senha por um canal seguro." : "O convidado recebe um e-mail, entra e define a senha em “Conta”."}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
