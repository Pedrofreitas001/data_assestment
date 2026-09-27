import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../context/auth";
import { IS_DEMO } from "../lib/supabase";
import { Field, MoulisMark, Spinner } from "../components/ui";

type Mode = "password" | "magic" | "signup" | "reset";

export default function Login() {
  const { signInPassword, signInMagic, signUp, resetPassword, enterDemo } = useAuth();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "password") await signInPassword(email, password);
      if (mode === "magic") {
        await signInMagic(email);
        setMsg({ kind: "ok", text: "Enviamos um link de acesso para o seu e-mail." });
      }
      if (mode === "signup") {
        await signUp(email, password, name);
        setMsg({ kind: "ok", text: "Conta criada. Confirme pelo e-mail e peça à consultoria para vincular sua empresa." });
      }
      if (mode === "reset") {
        await resetPassword(email);
        setMsg({ kind: "ok", text: "Se o e-mail existir, você receberá um link para redefinir a senha." });
      }
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Não foi possível entrar." });
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, string> = { password: "Entrar", magic: "Entrar com link", signup: "Criar conta", reset: "Redefinir senha" };

  return (
    <div className="login">
      <section className="login-art">
        <div className="row" style={{ gap: 12 }}>
          <span className="brand-mark">
            <MoulisMark size={18} />
          </span>
          <span className="brand-name" style={{ fontSize: 22 }}>
            moulis
          </span>
        </div>
        <div>
          <p className="login-eyebrow">Diagnóstico de maturidade de dados</p>
          <h1>Saiba onde seus dados estão hoje — e o que fazer a seguir.</h1>
          <p>Um diagnóstico objetivo, um relatório claro e um plano de ação priorizado.</p>
        </div>
        <p className="xs" style={{ color: "#6b6b6b", margin: 0 }}>
          © Moulis Consultoria
        </p>
      </section>

      <section className="login-form">
        <div className="login-box">
          <h2 className="page-title" style={{ fontSize: 32, marginBottom: 6 }}>
            {IS_DEMO ? "Bem-vinda" : titles[mode]}
          </h2>

          {IS_DEMO ? (
            <>
              <p className="muted" style={{ marginTop: 0 }}>
                O Supabase ainda não está configurado, então o app roda em <b>modo demonstração</b>: dados de exemplo, salvos só neste navegador.
              </p>
              <button className="btn btn-primary btn-block" style={{ height: 44, marginTop: 12 }} onClick={enterDemo}>
                Entrar na demonstração <ArrowRight size={16} />
              </button>
              <p className="xs muted" style={{ marginTop: 18 }}>
                Para login por usuário e painel multi-cliente, defina <span className="mono">VITE_SUPABASE_URL</span> e <span className="mono">VITE_SUPABASE_ANON_KEY</span> (veja <span className="mono">docs/DEPLOY.md</span>).
              </p>
            </>
          ) : (
            <form onSubmit={submit} className="stack" style={{ gap: 14 }}>
              <p className="muted" style={{ margin: 0 }}>
                {mode === "signup" ? "Acesso de clientes é liberado pela consultoria após o cadastro." : "Use o e-mail cadastrado pela consultoria."}
              </p>
              {mode === "signup" && (
                <Field label="Nome completo" htmlFor="name">
                  <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                </Field>
              )}
              <Field label="E-mail" htmlFor="email">
                <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </Field>
              {(mode === "password" || mode === "signup") && (
                <Field label="Senha" htmlFor="pw" hint={mode === "signup" ? "Mínimo de 8 caracteres." : undefined}>
                  <input id="pw" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                </Field>
              )}
              {msg && <div className={`callout ${msg.kind === "err" ? "risk" : "soft"}`}>{msg.text}</div>}
              <button className="btn btn-primary btn-block" style={{ height: 44 }} disabled={busy}>
                {busy ? <Spinner /> : titles[mode]}
              </button>
              <div className="row wrap" style={{ justifyContent: "space-between" }}>
                {mode !== "password" && (
                  <button type="button" className="link-btn" onClick={() => setMode("password")}>
                    Entrar com senha
                  </button>
                )}
                {mode !== "magic" && (
                  <button type="button" className="link-btn" onClick={() => setMode("magic")}>
                    Receber link por e-mail
                  </button>
                )}
                {mode === "password" && (
                  <button type="button" className="link-btn" onClick={() => setMode("reset")}>
                    Esqueci a senha
                  </button>
                )}
                {mode !== "signup" && (
                  <button type="button" className="link-btn" onClick={() => setMode("signup")}>
                    Criar conta
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
