import { friendlyError } from "../lib/errors";
import { useEffect, useMemo, useState } from "react";
import { BookMarked, Plus, Sigma, Sparkles, Trash2 } from "lucide-react";
import { useOrg } from "../context/org";
import { useCopilot } from "../context/copilot";
import { normKpiAi } from "../lib/sanitize";
import { useToast } from "../context/toast";
import { useRows } from "../lib/useRows";
import { store, uid } from "../lib/store";
import { callSkill } from "../lib/llm";
import { relTime } from "../lib/format";
import { DOMAINS } from "../model/framework";
import { KPI_LIBRARY } from "../model/kpiLibrary";
import { KPI_DIRECTIONS, KPI_REQUIRED_FIELDS, KPI_STATUS, completeness, looksLikeSecret } from "../model/kpiOptions";
import type { Kpi } from "../model/types";
import { AiMark, Bar, Drawer, Empty, Field, LoadingPage, Metrics, Modal, PageHead, Spinner, StatusBadge } from "../components/ui";

const domLabel = Object.fromEntries(DOMAINS.map((d) => [d.key, d.title]));

function blankKpi(orgId: string): Kpi {
  return {
    id: "", organization_id: orgId, name: "", code: null, domain: null, definition: null, business_question: null, formula: null, numerator: null, denominator: null,
    unit: null, granularity: null, frequency: null, direction: null, target: null, owner: null, steward: null, assumptions: null, exclusions: null,
    source_tables: null, lineage: null, quality_checks: null, consumers: null, status: "rascunho", version: "1.0", notes: null,
  };
}

interface KpiAiOut {
  kpi: Partial<Kpi>;
  issues: { field: string; severity: "alta" | "media" | "baixa"; message: string }[];
  clarifying_questions: string[];
}

export default function Glossary() {
  const { org, orgId } = useOrg();
  const toast = useToast();
  const kpis = useRows("kpis", orgId);
  const [edit, setEdit] = useState<Kpi | null>(null);
  const [libOpen, setLibOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [q, setQ] = useState("");
  const [fDomain, setFDomain] = useState("");
  const [fStatus, setFStatus] = useState("");

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return kpis.rows.filter(
      (k) => (!fDomain || k.domain === fDomain) && (!fStatus || k.status === fStatus) && (!t || [k.name, k.code, k.definition, k.owner, k.formula].some((x) => (x || "").toLowerCase().includes(t))),
    );
  }, [kpis.rows, q, fDomain, fStatus]);

  const copilot = useCopilot();
  useEffect(() => {
    if (kpis.loading || !orgId) return;
    copilot.setFocus({ tela: "Glossário de KPIs", kpis: kpis.rows.map((k) => ({ nome: k.name, owner: k.owner, status: k.status, formula: k.formula })) });
    const noOwner = kpis.rows.filter((k) => !k.owner).length;
    if (!kpis.rows.length)
      copilot.nudge({ id: `kpi-empty-${orgId}`, text: "O glossário está vazio. Posso sugerir os primeiros KPIs para a empresa e explicar como documentar cada um.", followUps: ["Quais KPIs devemos documentar primeiro?", "O que uma ficha de KPI precisa ter?"] });
    else if (noOwner)
      copilot.nudge({ id: `kpi-owner-${orgId}`, text: `**${noOwner} KPI(s) sem owner.** Sem dono, a definição não tem quem aprove as premissas. Quer ajuda para decidir quem deve ser o owner de cada um?`, followUps: ["Como escolher o owner de um KPI?", "Qual a diferença entre owner e steward?"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpis.loading, kpis.rows.length, orgId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => copilot.setFocus(null), []);

  if (kpis.loading) return <LoadingPage />;
  if (!orgId) return <Empty title="Selecione uma empresa" />;

  const validated = kpis.rows.filter((k) => k.status === "validado").length;
  const noOwner = kpis.rows.filter((k) => !k.owner).length;
  const avg = kpis.rows.length ? kpis.rows.reduce((s, k) => s + completeness(k, KPI_REQUIRED_FIELDS), 0) / kpis.rows.length : 0;

  return (
    <>
      <PageHead
        eyebrow={org?.name}
        title="Glossário de KPIs"
        desc="Uma definição por indicador: o que mede, como se calcula, premissas, quem é o dono e de quais tabelas vem. Fim da pergunta “qual número está certo?”."
        actions={
          <>
            <button className="btn" onClick={() => setLibOpen(true)}>
              <BookMarked size={15} /> Biblioteca Moulis
            </button>
            <button className="btn btn-ai" onClick={() => setDraftOpen(true)}>
              <Sparkles size={15} /> Redigir com IA
            </button>
            <button className="btn btn-primary" onClick={() => setEdit(blankKpi(orgId))}>
              <Plus size={16} /> Novo KPI
            </button>
          </>
        }
      />

      <div style={{ marginBottom: 20 }}>
        <Metrics
          items={[
            { label: "KPIs documentados", value: kpis.rows.length },
            { label: "Validados pelo owner", value: validated },
            { label: "Sem owner", value: noOwner },
            { label: "Fichas completas", value: `${Math.round(avg * 100)}%` },
          ]}
        />
      </div>

      <div className="toolbar">
        <input className="input input-search" placeholder="Buscar KPI, fórmula, owner…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={fDomain} onChange={(e) => setFDomain(e.target.value)}>
          <option value="">Todos os domínios</option>
          {DOMAINS.map((d) => (
            <option key={d.key} value={d.key}>
              {d.title}
            </option>
          ))}
        </select>
        <select className="select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {KPI_STATUS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {!list.length ? (
        <div className="card">
          <Empty icon={<Sigma size={20} />} title={kpis.rows.length ? "Nada encontrado" : "Glossário vazio"} action={!kpis.rows.length ? <button className="btn btn-primary" onClick={() => setLibOpen(true)}><BookMarked size={15} /> Começar pela biblioteca</button> : undefined}>
            {kpis.rows.length ? "Ajuste os filtros." : "Importe definições de referência e adapte com o responsável por cada indicador."}
          </Empty>
        </div>
      ) : (
        <div className="grid g-3">
          {list.map((k) => {
            const c = completeness(k, KPI_REQUIRED_FIELDS);
            return (
              <div key={k.id} className="card kpi-card" onClick={() => setEdit(k)}>
                <div className="row-between">
                  <span className="code">{[k.code, k.domain && domLabel[k.domain]].filter(Boolean).join(" · ") || "—"}</span>
                  <StatusBadge status={k.status} />
                </div>
                <h3>{k.name}</h3>
                {k.definition && <div className="small muted" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{k.definition}</div>}
                {k.formula && <div className="formula">{k.formula}</div>}
                <div className="foot">
                  <span>{k.owner ? `Owner: ${k.owner}` : <span style={{ color: "var(--risk)" }}>Sem owner</span>}</span>
                  <span className="row" style={{ gap: 6, width: 90 }}>
                    <span className="grow">
                      <Bar value={c * 100} thin brand />
                    </span>
                    <span className="num">{Math.round(c * 100)}%</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {edit && (
        <KpiDrawer
          kpi={edit}
          context={{ empresa: org?.name, segmento: org?.segment }}
          onClose={() => setEdit(null)}
          onSave={async (row) => {
            await kpis.save({ ...row, id: row.id || uid() });
            toast("KPI salvo");
            setEdit(null);
          }}
          onDelete={async (id) => {
            await kpis.remove(id);
            toast("KPI removido");
            setEdit(null);
          }}
        />
      )}
      {libOpen && (
        <LibraryModal
          existing={kpis.rows}
          onClose={() => setLibOpen(false)}
          onImport={async (keys) => {
            for (const key of keys) {
              const { key: _k, ...t } = KPI_LIBRARY.find((x) => x.key === key)!;
              void _k;
              await store.upsert("kpis", { ...blankKpi(orgId), ...t, id: uid() });
            }
            await kpis.reload();
            toast(`${keys.length} KPI(s) importados — defina owner e valide as premissas`);
            setLibOpen(false);
          }}
        />
      )}
      {draftOpen && (
        <DraftModal
          context={{ empresa: org?.name, segmento: org?.segment }}
          onClose={() => setDraftOpen(false)}
          onDraft={(k) => {
            setDraftOpen(false);
            setEdit({ ...blankKpi(orgId), ...k, id: "", status: "rascunho" } as Kpi);
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------
function KpiDrawer({ kpi, context, onClose, onSave, onDelete }: { kpi: Kpi; context: unknown; onClose: () => void; onSave: (k: Kpi) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const toast = useToast();
  const [f, setF] = useState<Kpi>(kpi);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<KpiAiOut | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const set = <K extends keyof Kpi>(k: K, v: Kpi[K]) => setF((x) => ({ ...x, [k]: v }));
  const txt = (k: keyof Kpi) => ({ value: (f[k] as string) || "", onChange: (e: { target: { value: string } }) => set(k, (e.target.value || null) as never) });
  const missing = KPI_REQUIRED_FIELDS.filter((r) => {
    const v = (f as unknown as Record<string, unknown>)[r.key];
    return v === null || v === undefined || String(v).trim() === "";
  });
  const secret = looksLikeSecret(f.source_tables, f.lineage, f.notes);

  async function review() {
    setAiBusy(true);
    try {
      const { output } = await callSkill<unknown>("kpi-assist", { mode: "review", kpi: f, context });
      setAi(normKpiAi(output) as KpiAiOut);
    } catch (e) {
      toast(friendlyError(e, "Erro na IA"), "err");
    } finally {
      setAiBusy(false);
    }
  }

  const suggestedFields = ai ? Object.entries(ai.kpi || {}).filter(([k, v]) => v !== null && v !== undefined && v !== "" && k in f && (f as unknown as Record<string, unknown>)[k] !== v) : [];

  return (
    <Drawer
      eyebrow={kpi.id ? `Glossário · v${f.version || "1.0"} · atualizado ${relTime(kpi.updated_at)}` : "Glossário · nova ficha"}
      title={f.name || "Novo KPI"}
      onClose={onClose}
      wide
      footer={
        <>
          {kpi.id && (
            <button className="btn btn-danger btn-sm" style={{ marginRight: "auto" }} onClick={() => confirm("Remover este KPI do glossário?") && onDelete(kpi.id)}>
              <Trash2 size={14} /> Remover
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={!f.name.trim() || busy || secret}
            onClick={async () => {
              if (f.status === "validado" && !f.owner) return toast("Um KPI só pode ser validado com owner definido.", "err");
              setBusy(true);
              try {
                await onSave(f);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Spinner /> : "Salvar ficha"}
          </button>
        </>
      }
    >
      <div className="ai-box" style={{ marginBottom: 20 }}>
        <div className="row-between wrap">
          <div className="ai-box-head">
            <AiMark /> Completude {Math.round((1 - missing.length / KPI_REQUIRED_FIELDS.length) * 100)}%
            {missing.length > 0 && <span className="xs muted" style={{ fontWeight: 400 }}>falta: {missing.map((m) => m.label).join(", ")}</span>}
          </div>
          <button className="btn btn-sm btn-ai" onClick={review} disabled={aiBusy || !f.name.trim()}>
            {aiBusy ? <Spinner /> : <Sparkles size={14} />} Revisar com IA
          </button>
        </div>
        {ai && (
          <div className="stack" style={{ marginTop: 12, gap: 10 }}>
            {ai.issues?.map((i, n) => (
              <div key={n} className={`callout ${i.severity === "alta" ? "risk" : ""}`}>
                <div className="callout-title">
                  {i.field} <span className="badge badge-soft">{i.severity}</span>
                </div>
                <span className="small">{i.message}</span>
              </div>
            ))}
            {suggestedFields.length > 0 && (
              <div>
                <div className="row-between">
                  <p className="section-title" style={{ margin: "6px 0" }}>
                    Sugestões de redação
                  </p>
                  <button className="btn btn-xs" onClick={() => setF((x) => ({ ...x, ...Object.fromEntries(suggestedFields) }))}>
                    Aplicar todas
                  </button>
                </div>
                {suggestedFields.map(([k, v]) => (
                  <div key={k} className="row-between small" style={{ padding: "6px 0", borderTop: "1px solid var(--line)", alignItems: "flex-start" }}>
                    <span className="grow">
                      <b>{k}</b>: {String(v)}
                    </span>
                    <button className="btn btn-xs" onClick={() => set(k as keyof Kpi, v as never)}>
                      Aplicar
                    </button>
                  </div>
                ))}
              </div>
            )}
            {ai.clarifying_questions?.length > 0 && (
              <div className="callout soft">
                <div className="callout-title">Validar com o owner</div>
                <ul style={{ margin: 0, paddingLeft: 18 }} className="small">
                  {ai.clarifying_questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="form-section">
        <h4>Negócio</h4>
        <div className="form-grid">
          <Field label="Nome do KPI *">
            <input className="input" {...txt("name")} autoFocus={!kpi.id} />
          </Field>
          <div className="form-grid" style={{ gap: 12 }}>
            <Field label="Código">
              <input className="input" {...txt("code")} placeholder="LOG-001" />
            </Field>
            <Field label="Versão">
              <input className="input" {...txt("version")} />
            </Field>
          </div>
          <Field label="Domínio">
            <select className="select" value={f.domain || ""} onChange={(e) => set("domain", e.target.value || null)}>
              <option value="">—</option>
              {DOMAINS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="select" value={f.status} onChange={(e) => set("status", e.target.value as Kpi["status"])}>
              {KPI_STATUS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Definição" full hint="Em linguagem de negócio — alguém de outra área precisa entender.">
            <textarea className="textarea" {...txt("definition")} style={{ minHeight: 64 }} />
          </Field>
          <Field label="Pergunta de negócio que responde" full>
            <input className="input" {...txt("business_question")} />
          </Field>
        </div>
      </div>
      <div className="form-section">
        <h4>Cálculo</h4>
        <div className="form-grid">
          <Field label="Fórmula" full hint="Inequívoca: agregação, período, filtros.">
            <textarea className="textarea mono" {...txt("formula")} style={{ minHeight: 56 }} />
          </Field>
          <Field label="Numerador">
            <input className="input" {...txt("numerator")} />
          </Field>
          <Field label="Denominador">
            <input className="input" {...txt("denominator")} />
          </Field>
          <Field label="Unidade">
            <input className="input" {...txt("unit")} placeholder="%, R$, dias, un." />
          </Field>
          <Field label="Direção">
            <select className="select" value={f.direction || ""} onChange={(e) => set("direction", (e.target.value || null) as Kpi["direction"])}>
              <option value="">—</option>
              {KPI_DIRECTIONS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Granularidade">
            <input className="input" {...txt("granularity")} placeholder="Mês × unidade × produto/serviço" />
          </Field>
          <Field label="Frequência">
            <input className="input" {...txt("frequency")} placeholder="Diária" />
          </Field>
          <Field label="Meta / faixa aceitável" full>
            <input className="input" {...txt("target")} />
          </Field>
        </div>
      </div>
      <div className="form-section">
        <h4>Premissas</h4>
        <div className="form-grid">
          <Field label="Premissas" full hint="Data de referência, bruto × líquido, tratamento de devoluções, dias úteis × corridos…">
            <textarea className="textarea" {...txt("assumptions")} />
          </Field>
          <Field label="Exclusões" full>
            <textarea className="textarea" {...txt("exclusions")} style={{ minHeight: 56 }} />
          </Field>
        </div>
      </div>
      <div className="form-section">
        <h4>Governança</h4>
        <div className="form-grid">
          <Field label="Owner" hint="Aprova a definição.">
            <input className="input" {...txt("owner")} />
          </Field>
          <Field label="Steward" hint="Calcula e mantém.">
            <input className="input" {...txt("steward")} />
          </Field>
          <Field label="Consumidores" full>
            <input className="input" {...txt("consumers")} placeholder="Diretoria, Comercial, FP&A" />
          </Field>
        </div>
      </div>
      <div className="form-section">
        <h4>Fontes & qualidade</h4>
        <div className="form-grid">
          <Field label="Tabelas / caminhos" full hint="Ex.: ERP › NF_SAIDA_ITENS; Drive › Fretes.xlsx › aba 2026">
            <textarea className="textarea mono" {...txt("source_tables")} style={{ minHeight: 56 }} />
          </Field>
          <Field label="Linhagem" full>
            <input className="input" {...txt("lineage")} placeholder="ERP (notas fiscais) → base central (vendas) → Painel comercial" />
          </Field>
          <Field label="Checagens de qualidade" full>
            <textarea className="textarea" {...txt("quality_checks")} style={{ minHeight: 56 }} />
          </Field>
          <Field label="Notas" full>
            <textarea className="textarea" {...txt("notes")} style={{ minHeight: 56 }} />
          </Field>
        </div>
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------------
function LibraryModal({ existing, onClose, onImport }: { existing: Kpi[]; onClose: () => void; onImport: (keys: string[]) => Promise<void> }) {
  const names = new Set(existing.map((k) => k.name.toLowerCase()));
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      eyebrow="Biblioteca Moulis · modelos de indicadores"
      title="Importar definições de referência"
      onClose={onClose}
      footer={
        <>
          <span className="xs muted" style={{ marginRight: "auto" }}>
            Entram como rascunho, sem owner. Valide premissas com a empresa.
          </span>
          <button
            className="btn btn-primary"
            disabled={!sel.size || busy}
            onClick={async () => {
              setBusy(true);
              await onImport([...sel]);
              setBusy(false);
            }}
          >
            {busy ? <Spinner /> : `Importar ${sel.size || ""}`}
          </button>
        </>
      }
    >
      {DOMAINS.map((d) => {
        const items = KPI_LIBRARY.filter((k) => k.domain === d.key);
        if (!items.length) return null;
        return (
          <div key={d.key} style={{ marginBottom: 14 }}>
            <p className="section-title">{d.title}</p>
            {items.map((k) => {
              const has = names.has(k.name.toLowerCase());
              return (
                <label key={k.key} className="lib-item" style={{ opacity: has ? 0.45 : 1 }}>
                  <input
                    type="checkbox"
                    className="check"
                    disabled={has}
                    checked={sel.has(k.key)}
                    onChange={() => {
                      const n = new Set(sel);
                      if (n.has(k.key)) n.delete(k.key);
                      else n.add(k.key);
                      setSel(n);
                    }}
                  />
                  <div className="grow">
                    <div style={{ fontWeight: 500 }}>
                      {k.name} <span className="mono xs muted">{k.code}</span> {has && <span className="badge badge-soft">já no glossário</span>}
                    </div>
                    <div className="small muted">{k.definition}</div>
                    <div className="mono xs" style={{ marginTop: 3 }}>{k.formula}</div>
                  </div>
                </label>
              );
            })}
          </div>
        );
      })}
    </Modal>
  );
}

function DraftModal({ context, onClose, onDraft }: { context: unknown; onClose: () => void; onDraft: (k: Partial<Kpi>) => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      eyebrow={<span className="row" style={{ gap: 8 }}><AiMark size={11} /> Assistente do glossário</span>}
      title="Redigir ficha de KPI"
      onClose={onClose}
      footer={
        <button
          className="btn btn-primary"
          disabled={busy || name.trim().length < 3}
          onClick={async () => {
            setBusy(true);
            try {
              const output = normKpiAi((await callSkill<unknown>("kpi-assist", { mode: "draft", name, notes, context })).output) as KpiAiOut;
              onDraft({ ...output.kpi, name: output.kpi?.name || name, notes: output.clarifying_questions?.length ? `A validar com o owner:\n- ${output.clarifying_questions.join("\n- ")}` : null });
            } catch (e) {
              toast(friendlyError(e, "Erro na IA"), "err");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Spinner /> : <Sparkles size={14} />} Redigir
        </button>
      }
    >
      <div className="stack">
        <Field label="Nome do indicador">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nível de serviço do CD" autoFocus />
        </Field>
        <Field label="Como a empresa usa / calcula hoje (opcional)" hint="Quanto mais contexto, menos premissas genéricas.">
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: hoje o Carlos pega os pedidos expedidos no dia sobre os pedidos recebidos até 14h, na planilha de expedição…" />
        </Field>
      </div>
    </Modal>
  );
}
