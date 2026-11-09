// Steward do diagnóstico: a pessoa consegue conduzir o assessment junto com as áreas?
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Lock, Plus, Star, Trash2, UserCheck } from "lucide-react";
import { useOrg } from "../context/org";
import { useCopilot } from "../context/copilot";
import { useToast } from "../context/toast";
import { useRows } from "../lib/useRows";
import { uid } from "../lib/store";
import { friendlyError } from "../lib/errors";
import { STEWARD_DIMENSIONS, scoreSteward, type StewardResult, type StewardReview } from "../model/steward";
import Radar from "../components/Radar";
import { Bar, Drawer, Empty, Field, LoadingPage, PageHead, Spinner } from "../components/ui";

function blank(orgId: string): StewardReview {
  return { id: "", organization_id: orgId, name: "", role: null, area: null, answers: {}, notes: null, chosen: false };
}

export default function Steward() {
  const { org, orgId } = useOrg();
  const toast = useToast();
  const copilot = useCopilot();
  const reviews = useRows("steward_reviews", orgId);
  const [edit, setEdit] = useState<StewardReview | null>(null);

  const scored = useMemo(
    () => reviews.rows.map((r) => ({ r, s: scoreSteward(r) })).sort((a, b) => Number(b.r.chosen) - Number(a.r.chosen) || (b.s.overall ?? -1) - (a.s.overall ?? -1)),
    [reviews.rows],
  );

  useEffect(() => {
    if (!org || reviews.loading) return;
    copilot.setFocus({
      tela: "Steward do diagnóstico",
      candidatos: scored.map(({ r, s }) => ({ nome: r.name, cargo: r.role, nota: s.overall, perfil: s.profile.title, escolhido: r.chosen, dimensoes: s.dims })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, reviews.loading, scored]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => copilot.setFocus(null), []);

  if (reviews.loading) return <LoadingPage />;
  if (!orgId || !org) return <Empty title="Selecione uma empresa" />;

  const choose = async (r: StewardReview) => {
    try {
      // Um steward por empresa: desmarca os outros.
      for (const o of reviews.rows) if (o.chosen && o.id !== r.id) await reviews.save({ ...o, chosen: false });
      await reviews.save({ ...r, chosen: !r.chosen });
      toast(r.chosen ? "Escolha desfeita" : `${r.name} é o steward do diagnóstico`);
    } catch (e) {
      toast(friendlyError(e, "Não foi possível salvar"), "err");
    }
  };

  return (
    <>
      <PageHead
        eyebrow={org.name}
        title="Steward do diagnóstico"
        desc="Quem da empresa vai ser a ponte entre as áreas e o diagnóstico? Não precisa ser especialista em dados: precisa conhecer o negócio, ter familiaridade com números, trânsito entre as áreas e tempo."
        actions={
          <button className="btn btn-primary" onClick={() => setEdit(blank(orgId))}>
            <Plus size={16} /> Avaliar pessoa
          </button>
        }
      />
      <p className="sw-private">
        <Lock size={13} /> Visível só para a equipe Moulis. É uma avaliação de prontidão para o papel, não de desempenho.
      </p>

      {!scored.length ? (
        <div className="card">
          <Empty icon={<UserCheck size={20} />} title="Nenhuma pessoa avaliada" action={<button className="btn btn-primary" onClick={() => setEdit(blank(orgId))}><Plus size={15} /> Avaliar a primeira pessoa</button>}>
            Uma conversa de 15 a 20 minutos com o candidato e com o gestor dele basta. São 11 perguntas em 4 blocos.
          </Empty>
        </div>
      ) : (
        <div className="sw-grid">
          {scored.map(({ r, s }) => (
            <CandidateCard key={r.id} r={r} s={s} onOpen={() => setEdit(r)} onChoose={() => void choose(r)} />
          ))}
        </div>
      )}

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <div>
            <h3 className="card-title">O que o papel exige</h3>
            <p className="card-sub">O steward conduz as conversas do diagnóstico com cada área, junta as evidências e cobra o plano.</p>
          </div>
        </div>
        <div className="card-body sw-req">
          {STEWARD_DIMENSIONS.map((d) => (
            <div key={d.key} className="sw-req-box">
              <b>{d.title}</b>
              <ul>
                {d.questions.map((q) => (
                  <li key={q.id}>{q.prompt}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {edit && (
        <ReviewDrawer
          review={edit}
          onClose={() => setEdit(null)}
          onSave={async (row) => {
            await reviews.save({ ...row, id: row.id || uid() });
            toast("Avaliação salva");
            setEdit(null);
          }}
          onDelete={async (id) => {
            await reviews.remove(id);
            toast("Avaliação removida");
            setEdit(null);
          }}
        />
      )}
    </>
  );
}

function ProfileTag({ s }: { s: StewardResult }) {
  return <span className={`sw-profile sw-p-${s.profile.key}`}>{s.profile.title}</span>;
}

function DimBars({ s }: { s: StewardResult }) {
  return (
    <div className="sw-dims">
      {STEWARD_DIMENSIONS.map((d) => (
        <div key={d.key} className="sw-dim">
          <span>{d.short}</span>
          <Bar value={s.dims[d.key]} thin brand />
          <b>{s.dims[d.key] === null ? "—" : Math.round(s.dims[d.key]!)}</b>
        </div>
      ))}
    </div>
  );
}

function CandidateCard({ r, s, onOpen, onChoose }: { r: StewardReview; s: StewardResult; onOpen: () => void; onChoose: () => void }) {
  return (
    <article className={`sw-card ${r.chosen ? "chosen" : ""}`}>
      <div className="sw-card-head">
        <div className="sw-score">{s.overall ?? "—"}</div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="sw-name">
            {r.name}
            {r.chosen && (
              <span className="sw-chosen">
                <Star size={11} /> Steward escolhido
              </span>
            )}
          </div>
          <div className="xs muted">{[r.role, r.area].filter(Boolean).join(" · ") || "Cargo não informado"}</div>
        </div>
      </div>
      <ProfileTag s={s} />
      <p className="small muted" style={{ margin: "8px 0 12px" }}>{s.profile.summary}</p>
      <div className="sw-viz">
        <Radar dims={s.dims} size={104} />
        <DimBars s={s} />
      </div>
      {s.support.length > 0 && s.profile.key !== "incompleto" && (
        <div className="sw-support">
          <b>Como apoiar</b>
          <ul>
            {s.support.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="sw-actions">
        <button className="btn btn-sm" onClick={onOpen}>
          Abrir avaliação
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onChoose}>
          {r.chosen ? "Desfazer escolha" : <><Check size={13} /> Escolher como steward</>}
        </button>
      </div>
    </article>
  );
}

type StepKey = "pessoa" | "negocio" | "dados" | "transito" | "tempo" | "resultado";
const STEPS: { key: StepKey; label: string }[] = [
  { key: "pessoa", label: "Pessoa" },
  ...STEWARD_DIMENSIONS.map((d) => ({ key: d.key as StepKey, label: d.short })),
  { key: "resultado", label: "Resultado" },
];

function ReviewDrawer({ review, onClose, onSave, onDelete }: { review: StewardReview; onClose: () => void; onSave: (r: StewardReview) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const toast = useToast();
  const [f, setF] = useState<StewardReview>(review);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(review.id ? STEPS.length - 1 : 0);
  const s = scoreSteward(f);
  const setAns = (id: string, v: number) => setF((x) => ({ ...x, answers: { ...x.answers, [id]: x.answers[id] === v ? 0 : v } }));
  const cur = STEPS[step];
  const dim = STEWARD_DIMENSIONS.find((d) => d.key === cur.key);
  const last = step === STEPS.length - 1;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(friendlyError(e, "Não foi possível salvar"), "err");
    } finally {
      setBusy(false);
    }
  };
  const save = () => run(() => onSave({ ...f, name: f.name.trim() }));
  const done = (key: StepKey) => {
    const d = STEWARD_DIMENSIONS.find((x) => x.key === key);
    if (d) return d.questions.every((q) => (f.answers[q.id] ?? 0) > 0);
    if (key === "pessoa") return !!f.name.trim();
    return false;
  };

  return (
    <Drawer
      wide
      eyebrow="Steward do diagnóstico"
      title={f.name || "Nova avaliação"}
      onClose={onClose}
      footer={
        <>
          <span className="sw-live" title={s.profile.summary}>
            <b>{s.overall ?? "—"}</b>
            <span>{s.profile.title}</span>
          </span>
          {review.id && (
            <button className="btn btn-ghost sw-del" disabled={busy} onClick={() => run(() => onDelete(review.id))} aria-label="Remover avaliação">
              <Trash2 size={14} />
            </button>
          )}
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ArrowLeft size={14} /> Voltar
          </button>
          {last ? (
            <button className="btn btn-primary" disabled={busy || !f.name.trim()} onClick={save}>
              {busy ? <Spinner /> : "Salvar avaliação"}
            </button>
          ) : (
            <button className="btn btn-primary" disabled={step === 0 && !f.name.trim()} onClick={() => setStep(step + 1)}>
              Próximo <ArrowRight size={14} />
            </button>
          )}
        </>
      }
    >
      <ol className="sw-steps" role="tablist" aria-label="Etapas da avaliação">
        {STEPS.map((st, i) => (
          <li key={st.key}>
            <button role="tab" aria-selected={i === step} className={`sw-step ${i === step ? "on" : ""} ${done(st.key) && i !== step ? "done" : ""}`} disabled={i > 0 && !f.name.trim()} onClick={() => setStep(i)}>
              <span>{done(st.key) && i !== step ? <Check size={12} /> : i + 1}</span>
              {st.label}
            </button>
          </li>
        ))}
      </ol>

      {cur.key === "pessoa" && (
        <section className="sw-pane">
          <h3 className="sw-pane-title">Quem está sendo avaliado?</h3>
          <p className="small muted">Uma conversa de 15 a 20 minutos com a pessoa e com o gestor dela basta. Você responde pelas perguntas das próximas etapas.</p>
          <div className="form-grid">
            <Field label="Nome">
              <input className="input" value={f.name} autoFocus={!review.id} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} />
            </Field>
            <Field label="Cargo">
              <input className="input" value={f.role || ""} onChange={(e) => setF((x) => ({ ...x, role: e.target.value || null }))} placeholder="Ex.: coordenadora comercial" />
            </Field>
            <Field label="Área onde trabalha hoje" full>
              <input className="input" value={f.area || ""} onChange={(e) => setF((x) => ({ ...x, area: e.target.value || null }))} placeholder="Ex.: Comercial" />
            </Field>
          </div>
        </section>
      )}

      {dim && (
        <section className="sw-pane" key={dim.key}>
          <div className="sw-pane-head">
            <h3 className="sw-pane-title">{dim.title}</h3>
            <span className="sw-pane-score">{s.dims[dim.key] === null ? "—" : Math.round(s.dims[dim.key]!)}</span>
          </div>
          {dim.questions.map((q, qi) => (
            <div key={q.id} className="sw-q">
              <div className="sw-q-n">
                Pergunta {qi + 1} de {dim.questions.length}
              </div>
              <div className="sw-q-prompt">{q.prompt}</div>
              <div className="sw-q-probe">Como checar: {q.probe}</div>
              <div className="opts opts-inline sw-opts" role="radiogroup">
                {q.options.map((o) => (
                  <button key={o.v} type="button" role="radio" aria-checked={f.answers[q.id] === o.v} className={`opt ${f.answers[q.id] === o.v ? "on" : ""}`} onClick={() => setAns(q.id, o.v)}>
                    <span className="lv">{o.v}</span>
                    <span>{o.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {cur.key === "resultado" && (
        <section className="sw-pane">
          <div className="sw-final">
            <Radar dims={s.dims} size={150} labels />
            <div className="grow">
              <ProfileTag s={s} />
              <div className="sw-final-score">
                <b>{s.overall ?? "—"}</b>
                <span>de 100 · {s.answered} de {s.total} perguntas</span>
              </div>
              <p className="small" style={{ margin: "8px 0 0" }}>{s.profile.summary}</p>
            </div>
          </div>
          {s.support.length > 0 && s.profile.key !== "incompleto" && (
            <div className="sw-support">
              <b>Como apoiar</b>
              <ul>
                {s.support.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {s.profile.key === "incompleto" && (
            <p className="small muted" style={{ marginTop: 12 }}>
              Faltam respostas: {STEWARD_DIMENSIONS.filter((d) => !done(d.key)).map((d) => d.short).join(", ")}. Use as etapas acima para completar.
            </p>
          )}
          <div style={{ height: 14 }} />
          <Field label="Observações" full>
            <textarea className="textarea" value={f.notes || ""} onChange={(e) => setF((x) => ({ ...x, notes: e.target.value || null }))} placeholder="O que você viu na conversa, exemplos concretos, quem mais foi ouvido." />
          </Field>
        </section>
      )}
    </Drawer>
  );
}
