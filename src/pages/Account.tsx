import { useState } from "react";
import { useAuth } from "../context/auth";
import { useToast } from "../context/toast";
import { supabase, IS_DEMO } from "../lib/supabase";
import { Field, PageHead } from "../components/ui";

export default function Account() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(profile?.full_name || "");
  const [pw, setPw] = useState("");

  async function saveName() {
    if (IS_DEMO || !supabase || !profile) return toast("Indisponível no modo demonstração", "err");
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", profile.id);
    if (error) return toast(error.message, "err");
    await refreshProfile();
    toast("Nome atualizado");
  }
  async function savePw() {
    if (IS_DEMO || !supabase) return toast("Indisponível no modo demonstração", "err");
    if (pw.length < 8) return toast("A senha precisa de 8+ caracteres", "err");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast(error.message, "err");
    setPw("");
    toast("Senha definida");
  }

  return (
    <>
      <PageHead eyebrow="Conta" title="Seu acesso" desc="Se você chegou por um convite, defina sua senha aqui para os próximos acessos." />
      <div className="grid g-2">
        <div className="card card-pad stack">
          <Field label="E-mail">
            <input className="input" value={profile?.email || ""} disabled />
          </Field>
          <Field label="Nome">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div>
            <button className="btn" onClick={saveName}>
              Salvar nome
            </button>
          </div>
        </div>
        <div className="card card-pad stack">
          <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </Field>
          <div>
            <button className="btn btn-primary" onClick={savePw}>
              Definir senha
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
