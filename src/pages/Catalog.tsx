import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Database, KeyRound, Plus, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { useOrg } from "../context/org";
import { useToast } from "../context/toast";
import { useRows } from "../lib/useRows";
import { uid } from "../lib/store";
import { callSkill } from "../lib/llm";
import { fmtDate, relTime } from "../lib/format";
import { DOMAINS } from "../model/framework";
import {
  ACCESS_METHODS,
  ASSET_REQUIRED_FIELDS,
  ASSET_TYPES,
  CREDENTIAL_STATUS,
  CREDENTIAL_TYPES,
  FREQUENCIES,
  LAYERS,
  PIPELINE_LEVELS,
  QUALITY_STATUS,
  SENSITIVITY,
  completeness,
  looksLikeSecret,
} from "../model/catalogOptions";
import type { CredentialRecord, DataAsset, Layer } from "../model/types";
import { AiMark, Bar, Drawer, Empty, Field, LoadingPage, Modal, PageHead, Spinner, Stat, Tabs } from "../components/ui";

type Tab = "ativos" | "credenciais" | "linhagem";
const typeLabel = Object.fromEntries(ASSET_TYPES.map((t) => [t.key, t.label]));
const layerLabel = Object.fromEntries(LAYERS.map((t) => [t.key, t.label]));
const sensLabel = Object.fromEntries(SENSITIVITY.map((t) => [t.key, t.label]));
const domLabel = Object.fromEntries(DOMAINS.map((d) => [d.key, d.title]));
const credLabel = Object.fromEntries(CREDENTIAL_STATUS.map((t) => [t.key, t.label]));

function blankAsset(orgId: string): DataAsset {
  return {
    id: "", organization_id: orgId, name: "", asset_type: "sistema", system: null, domain: null, description: null, location: null, owner: null, steward: null,
    access_method: null, refresh_frequency: null, layer: "origem", sensitivity: null, pipeline_level: null, quality_status: "nao_avaliado", upstream: [], tags: [], notes: null,
  };
}
function blankCred(orgId: string): CredentialRecord {
  return { id: "", organization_id: orgId, asset_id: null, name: "", credential_type: null, holder: null, vault_location: null, status: "desconhecida", expires_at: null, last_verified_at: null, notes: null };
}

export default function Catalog() {
  const { org, orgId } = useOrg();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "ativos";
  const setTab = (t: Tab) => setParams(t === "ativos" ? {} : { tab: t });
  const assets = useRows("data_assets", orgId);
  const creds = useRows("credentials", orgId);
  const [editAsset, setEditAsset] = useState<DataAsset | null>(null);
  const [editCred, setEditCred] = useState<CredentialRecord | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("");
  const [fDomain, setFDomain] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return assets.rows.filter(
      (a) =>
        (!fType || a.asset_type === fType) &&
        (!fDomain || a.domain === fDomain) &&
        (!t || [a.name, a.system, a.owner, a.steward, a.location, a.description].some((x) => (x || "").toLowerCase().includes(t))),
    );
  }, [assets.rows, q, fType, fDomain]);

  if (assets.loading) return <LoadingPage />;
  if (!orgId) return <Empty title="Selecione uma empresa" />;

  const withOwner = assets.rows.filter((a) => a.owner).length;
  const lgpd = assets.rows.filter((a) => a.sensitivity === "pessoal_lgpd").length;
  const unclassified = assets.rows.filter((a) => !a.sensitivity).length;
  const avgCompl = assets.rows.length ? assets.rows.reduce((s, a) => s + completeness(a, ASSET_REQUIRED_FIELDS), 0) / assets.rows.length : 0;
  const credIssues = creds.rows.filter((c) => c.status !== "ativa" || !c.vault_location).length;

  return (
    <>
      <PageHead
        eyebrow={org?.name}
        title="Catálogo de dados"
        desc="Inventário vivo de sistemas, planilhas, APIs, pipelines e relatórios — com dono, camada, sensibilidade e acesso. É o metadado que transforma dados soltos em ativos governados."
        actions={
          <>
            <button className="btn btn-ai" onClick={() => setImportOpen(true)}>
              <Sparkles size={15} /> Mapear com IA
            </button>
            {tab === "credenciais" ? (
              <button className="btn btn-primary" onClick={() => setEditCred(blankCred(orgId))}>
                <Plus size={16} /> Nova credencial
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setEditAsset(blankAsset(orgId))}>
                <Plus size={16} /> Novo ativo
              </button>
            )}
          </>
        }
      />

      <div className="grid g-4" style={{ marginBottom: 22 }}>
        <Stat label="Ativos mapeados" value={assets.rows.length} foot={`${new Set(assets.rows.map((a) => a.asset_type)).size} tipos · ${new Set(assets.rows.map((a) => a.domain).filter(Boolean)).size} domínios`} />
        <Stat label="Com owner definido" value={assets.rows.length ? Math.round((withOwner / assets.rows.length) * 100) : "—"} unit="%" foot={`${assets.rows.length - withOwner} sem dono`} />
        <Stat label="Completude de metadados" value={Math.round(avgCompl * 100)} unit="%" foot={`${lgpd} com dado pessoal · ${unclassified} sem classificação`} />
        <Stat label="Credenciais" value={creds.rows.length} foot={credIssues ? <span style={{ color: "var(--risk)" }}>{credIssues} exigem ação</span> : "Sob controle"} />
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "ativos", label: "Ativos de dados", count: assets.rows.length },
          { key: "credenciais", label: "Credenciais & acessos", count: creds.rows.length },
          { key: "linhagem", label: "Linhagem" },
        ]}
      />

      {tab === "ativos" && (
        <>
          <div className="toolbar">
            <input className="input input-search" placeholder="Buscar por nome, sistema, owner…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="select" value={fType} onChange={(e) => setFType(e.target.value)}>
              <option value="">Todos os tipos</option>
              {ASSET_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <select className="select" value={fDomain} onChange={(e) => setFDomain(e.target.value)}>
              <option value="">Todos os domínios</option>
              {DOMAINS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          <div className="card">
            {!filtered.length ? (
              <Empty icon={<Database size={20} />} title={assets.rows.length ? "Nada encontrado" : "Catálogo vazio"} action={!assets.rows.length ? <button className="btn btn-primary" onClick={() => setImportOpen(true)}><Sparkles size={15} /> Mapear com IA</button> : undefined}>
                {assets.rows.length ? "Ajuste os filtros." : "Descreva em texto livre os sistemas, planilhas e rotinas da empresa e a IA estrutura os primeiros itens."}
              </Empty>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ativo</th>
                      <th>Tipo</th>
                      <th>Domínio</th>
                      <th>Camada</th>
                      <th>Owner / Steward</th>
                      <th>Sensibilidade</th>
                      <th style={{ width: 110 }}>Metadados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => {
                      const c = completeness(a, ASSET_REQUIRED_FIELDS);
                      return (
                        <tr key={a.id} className="click" onClick={() => setEditAsset(a)}>
                          <td>
                            <div className="cell-title">{a.name}</div>
                            <div className="cell-sub">{[a.system, a.refresh_frequency].filter(Boolean).join(" · ") || "—"}</div>
                          </td>
                          <td className="small">{typeLabel[a.asset_type]}</td>
                          <td className="small">{a.domain ? domLabel[a.domain] : "—"}</td>
                          <td>{a.layer ? <span className={`badge ${a.layer === "ouro" ? "badge-solid" : "badge-soft"}`}>{layerLabel[a.layer]}</span> : "—"}</td>
                          <td className="small">
                            {a.owner || <span style={{ color: "var(--risk)" }}>sem owner</span>}
                            <div className="cell-sub">{a.steward || "sem steward"}</div>
                          </td>
                          <td>{a.sensitivity ? <span className={`badge ${a.sensitivity === "pessoal_lgpd" ? "badge-risk" : "badge-soft"}`}>{sensLabel[a.sensitivity]}</span> : <span className="badge badge-dashed">não classificado</span>}</td>
                          <td>
                            <div className="row">
                              <div className="grow">
                                <Bar value={c * 100} thin />
                              </div>
                              <span className="xs muted num">{Math.round(c * 100)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "credenciais" && (
        <>
          <div className="callout" style={{ marginBottom: 16 }}>
            <div className="callout-title">
              <ShieldAlert size={15} /> Registro de governança, não cofre de senhas
            </div>
            <span className="small muted">
              Aqui fica <b>quem</b> detém cada acesso, <b>onde</b> o segredo está guardado (1Password, Bitwarden, Vault) e <b>quando</b> expira. Senhas e tokens colados são bloqueados automaticamente.
            </span>
          </div>
          <div className="card">
            {!creds.rows.length ? (
              <Empty icon={<KeyRound size={20} />} title="Nenhuma credencial registrada" action={<button className="btn btn-primary" onClick={() => setEditCred(blankCred(orgId))}><Plus size={16} /> Registrar</button>}>
                O manual aponta: credenciais que "ninguém sabe onde estão" são a causa mais comum de atraso em projetos de dados.
              </Empty>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Credencial</th>
                      <th>Ativo</th>
                      <th>Quem detém</th>
                      <th>Onde está guardada</th>
                      <th>Status</th>
                      <th>Verificada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creds.rows.map((c) => (
                      <tr key={c.id} className="click" onClick={() => setEditCred(c)}>
                        <td>
                          <div className="cell-title">{c.name}</div>
                          <div className="cell-sub">{c.credential_type || "—"}</div>
                        </td>
                        <td className="small">{assets.rows.find((a) => a.id === c.asset_id)?.name ?? "—"}</td>
                        <td className="small">{c.holder || <span style={{ color: "var(--risk)" }}>ninguém</span>}</td>
                        <td className="small">{c.vault_location || <span style={{ color: "var(--risk)" }}>não registrado</span>}</td>
                        <td>
                          <span className={`badge ${c.status === "ativa" ? "badge-solid" : c.status === "desconhecida" || c.status === "expirada" ? "badge-risk" : "badge-soft"}`}>{credLabel[c.status]}</span>
                        </td>
                        <td className="small muted">{c.last_verified_at ? fmtDate(c.last_verified_at) : "nunca"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "linhagem" && <Lineage assets={assets.rows} onOpen={setEditAsset} />}

      {editAsset && (
        <AssetDrawer
          asset={editAsset}
          all={assets.rows}
          onClose={() => setEditAsset(null)}
          onSave={async (row) => {
            await assets.save({ ...row, id: row.id || uid() });
            toast("Ativo salvo");
            setEditAsset(null);
          }}
          onDelete={async (id) => {
            await assets.remove(id);
            toast("Ativo removido");
            setEditAsset(null);
          }}
        />
      )}
      {editCred && (
        <CredDrawer
          cred={editCred}
          assets={assets.rows}
          onClose={() => setEditCred(null)}
          onSave={async (row) => {
            await creds.save({ ...row, id: row.id || uid() });
            toast("Credencial salva");
            setEditCred(null);
          }}
          onDelete={async (id) => {
            await creds.remove(id);
            toast("Credencial removida");
            setEditCred(null);
          }}
        />
      )}
      {importOpen && (
        <ImportModal
          orgId={orgId}
          existing={assets.rows}
          context={{ empresa: org?.name, segmento: org?.segment }}
          onClose={() => setImportOpen(false)}
          onImport={async (newAssets, newCreds) => {
            const created: DataAsset[] = [];
            for (const a of newAssets) created.push(await assets.save(a));
            for (const c of newCreds) {
              const link = created.find((a) => a.name === c.asset_name) || assets.rows.find((a) => a.name === c.asset_name);
              const { asset_name: _n, ...rest } = c;
              void _n;
              await creds.save({ ...rest, asset_id: link?.id ?? null });
            }
            toast(`${newAssets.length} ativo(s) e ${newCreds.length} credencial(is) adicionados`);
            setImportOpen(false);
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------
function AssetDrawer({ asset, all, onClose, onSave, onDelete }: { asset: DataAsset; all: DataAsset[]; onClose: () => void; onSave: (a: DataAsset) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [f, setF] = useState<DataAsset>(asset);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof DataAsset>(k: K, v: DataAsset[K]) => setF((x) => ({ ...x, [k]: v }));
  const txt = (k: keyof DataAsset) => ({ value: (f[k] as string) || "", onChange: (e: { target: { value: string } }) => set(k, (e.target.value || null) as never) });
  const secret = looksLikeSecret(f.description, f.location, f.notes, f.name);
  const others = all.filter((a) => a.id !== f.id);

  return (
    <Drawer
      eyebrow={asset.id ? `Atualizado ${relTime(asset.updated_at)}` : "Novo ativo"}
      title={asset.id ? asset.name : "Cadastrar ativo de dados"}
      onClose={onClose}
      wide
      footer={
        <>
          {asset.id && (
            <button className="btn btn-danger btn-sm" style={{ marginRight: "auto" }} onClick={() => confirm("Remover este ativo?") && onDelete(asset.id)}>
              <Trash2 size={14} /> Remover
            </button>
          )}
          {secret && <span className="xs" style={{ color: "var(--risk)" }}>Parece haver uma senha/token no texto — remova para salvar.</span>}
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={!f.name.trim() || secret || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(f);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Spinner /> : "Salvar"}
          </button>
        </>
      }
    >
      <div className="form-section">
        <h4>Identificação</h4>
        <div className="form-grid">
          <Field label="Nome do ativo *" full>
            <input className="input" {...txt("name")} placeholder="Ex.: VTEX — Pedidos e-commerce" autoFocus />
          </Field>
          <Field label="Tipo">
            <select className="select" value={f.asset_type} onChange={(e) => set("asset_type", e.target.value as DataAsset["asset_type"])}>
              {ASSET_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} — {t.hint}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sistema / ferramenta">
            <input className="input" {...txt("system")} placeholder="Ex.: TOTVS, VTEX, Power BI, Python" />
          </Field>
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
          <Field label="Localização / caminho" hint="URL, servidor, pasta, workspace — nunca credenciais.">
            <input className="input" {...txt("location")} placeholder="Ex.: Drive › Dados › DEPARA.xlsx" />
          </Field>
          <Field label="Descrição" full>
            <textarea className="textarea" {...txt("description")} placeholder="O que contém, granularidade, para que é usado." />
          </Field>
        </div>
      </div>
      <div className="form-section">
        <h4>Responsabilidade</h4>
        <div className="form-grid">
          <Field label="Data Owner" hint="Negócio: aprova definições e prioriza.">
            <input className="input" {...txt("owner")} placeholder="Nome (cargo)" />
          </Field>
          <Field label="Data Steward" hint="Execução: ingestão, consolidação, qualidade.">
            <input className="input" {...txt("steward")} placeholder="Nome (cargo)" />
          </Field>
        </div>
      </div>
      <div className="form-section">
        <h4>Arquitetura & acesso</h4>
        <div className="form-grid">
          <Field label="Camada">
            <select className="select" value={f.layer || ""} onChange={(e) => set("layer", (e.target.value || null) as Layer | null)}>
              <option value="">—</option>
              {LAYERS.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label} — {l.hint}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Maturidade da pipeline">
            <select className="select" value={f.pipeline_level ?? ""} onChange={(e) => set("pipeline_level", e.target.value ? Number(e.target.value) : null)}>
              <option value="">—</option>
              {PIPELINE_LEVELS.map((l) => (
                <option key={l.v} value={l.v}>
                  {l.label} — {l.hint}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Método de acesso">
            <select className="select" value={f.access_method || ""} onChange={(e) => set("access_method", e.target.value || null)}>
              <option value="">—</option>
              {ACCESS_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Frequência de atualização">
            <select className="select" value={f.refresh_frequency || ""} onChange={(e) => set("refresh_frequency", e.target.value || null)}>
              <option value="">—</option>
              {FREQUENCIES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Alimentado por (linhagem)" full hint="Ativos de onde este dado vem.">
            <div className="chips">
              {!others.length && <span className="xs muted">Cadastre outros ativos para ligar a linhagem.</span>}
              {others.map((o) => {
                const on = f.upstream?.includes(o.id);
                return (
                  <button key={o.id} type="button" className={`chip ${on ? "on" : ""}`} onClick={() => set("upstream", on ? f.upstream.filter((x) => x !== o.id) : [...(f.upstream || []), o.id])}>
                    {o.name}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </div>
      <div className="form-section">
        <h4>Segurança & qualidade</h4>
        <div className="form-grid">
          <Field label="Sensibilidade" hint={f.sensitivity === "pessoal_lgpd" ? "Dado pessoal: acesso restrito, base legal e retenção definidos." : undefined}>
            <select className="select" value={f.sensitivity || ""} onChange={(e) => set("sensitivity", (e.target.value || null) as DataAsset["sensitivity"])}>
              <option value="">—</option>
              {SENSITIVITY.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} — {s.hint}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qualidade percebida">
            <select className="select" value={f.quality_status || "nao_avaliado"} onChange={(e) => set("quality_status", e.target.value as DataAsset["quality_status"])}>
              {QUALITY_STATUS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags" hint="Separe por vírgula. Use chave-mestra para a tabela DIM de-para.">
            <input className="input" value={(f.tags || []).join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
          </Field>
          <Field label="Observações" full>
            <textarea className="textarea" {...txt("notes")} style={{ minHeight: 64 }} />
          </Field>
        </div>
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------------
function CredDrawer({ cred, assets, onClose, onSave, onDelete }: { cred: CredentialRecord; assets: DataAsset[]; onClose: () => void; onSave: (c: CredentialRecord) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [f, setF] = useState<CredentialRecord>(cred);
  const set = <K extends keyof CredentialRecord>(k: K, v: CredentialRecord[K]) => setF((x) => ({ ...x, [k]: v }));
  const secret = looksLikeSecret(f.name, f.holder, f.vault_location, f.notes);
  return (
    <Drawer
      eyebrow="Credencial & acesso"
      title={cred.id ? cred.name : "Registrar credencial"}
      onClose={onClose}
      footer={
        <>
          {cred.id && (
            <button className="btn btn-danger btn-sm" style={{ marginRight: "auto" }} onClick={() => confirm("Remover este registro?") && onDelete(cred.id)}>
              <Trash2 size={14} /> Remover
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!f.name.trim() || secret} onClick={() => onSave(f)}>
            Salvar
          </button>
        </>
      }
    >
      <div className={`callout ${secret ? "risk" : ""}`} style={{ marginBottom: 18 }}>
        <div className="callout-title">
          <ShieldAlert size={14} /> {secret ? "Isso parece um segredo — não é possível salvar" : "Não cole senhas, tokens ou chaves"}
        </div>
        <span className="small muted">{secret ? "Remova o valor. Se ele foi exposto, revogue/rotacione a credencial." : "Registre apenas quem detém, onde está guardada e a validade."}</span>
      </div>
      <div className="form-grid">
        <Field label="Nome *" full>
          <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: VTEX AppKey (OMS)" autoFocus />
        </Field>
        <Field label="Ativo relacionado">
          <select className="select" value={f.asset_id || ""} onChange={(e) => set("asset_id", e.target.value || null)}>
            <option value="">—</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo">
          <select className="select" value={f.credential_type || ""} onChange={(e) => set("credential_type", e.target.value || null)}>
            <option value="">—</option>
            {CREDENTIAL_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Quem detém / responde">
          <input className="input" value={f.holder || ""} onChange={(e) => set("holder", e.target.value || null)} />
        </Field>
        <Field label="Onde está guardada" hint="Ex.: 1Password › Cofre Dados › VTEX">
          <input className="input" value={f.vault_location || ""} onChange={(e) => set("vault_location", e.target.value || null)} />
        </Field>
        <Field label="Status">
          <select className="select" value={f.status} onChange={(e) => set("status", e.target.value as CredentialRecord["status"])}>
            {CREDENTIAL_STATUS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Expira em">
          <input className="input" type="date" value={f.expires_at || ""} onChange={(e) => set("expires_at", e.target.value || null)} />
        </Field>
        <Field label="Última verificação">
          <input className="input" type="date" value={f.last_verified_at || ""} onChange={(e) => set("last_verified_at", e.target.value || null)} />
        </Field>
        <Field label="Observações" full>
          <textarea className="textarea" value={f.notes || ""} onChange={(e) => set("notes", e.target.value || null)} />
        </Field>
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------------
function Lineage({ assets, onOpen }: { assets: DataAsset[]; onOpen: (a: DataAsset) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const related = useMemo(() => {
    if (!hover) return null;
    const set = new Set<string>([hover]);
    const up = (id: string) => assets.find((a) => a.id === id)?.upstream?.forEach((u) => !set.has(u) && (set.add(u), up(u)));
    const down = (id: string) => assets.filter((a) => a.upstream?.includes(id)).forEach((a) => !set.has(a.id) && (set.add(a.id), down(a.id)));
    up(hover);
    down(hover);
    return set;
  }, [hover, assets]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [links, setLinks] = useState<{ d: string; id: string; from: string; to: string }[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Mede a posição dos cartões e desenha curvas upstream → downstream.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const draw = () => {
      const base = wrap.getBoundingClientRect();
      const pos = (id: string) => wrap.querySelector<HTMLElement>(`[data-node="${id}"]`)?.getBoundingClientRect();
      const out: typeof links = [];
      for (const a of assets)
        for (const u of a.upstream || []) {
          const s = pos(u);
          const t = pos(a.id);
          if (!s || !t) continue;
          const sameCol = Math.abs(s.left - t.left) < 4;
          const x1 = (sameCol ? s.left : s.right) - base.left + wrap.scrollLeft;
          const y1 = s.top + s.height / 2 - base.top;
          const x2 = t.left - base.left + wrap.scrollLeft;
          const y2 = t.top + t.height / 2 - base.top;
          const dx = sameCol ? -28 : Math.max(24, (x2 - x1) / 2);
          out.push({ id: `${u}-${a.id}`, from: u, to: a.id, d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - (sameCol ? 28 : dx)},${y2} ${x2},${y2}` });
        }
      setLinks(out);
      setSize({ w: wrap.scrollWidth, h: wrap.scrollHeight });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [assets]);

  if (!assets.length) return <div className="card"><Empty icon={<Database size={20} />} title="Sem ativos para desenhar a linhagem" /></div>;
  const cols: Layer[] = ["origem", "bronze", "prata", "ouro"];
  return (
    <div className="card card-pad">
      <p className="small muted" style={{ marginTop: 0 }}>
        Arquitetura medallion: origem → bronze (bruto) → prata (chave comum, limpo) → ouro (KPIs). Passe o mouse para ver de onde o dado vem e para onde vai.
      </p>
      <div className="lineage-wrap" ref={wrapRef}>
      <svg className="links" width={size.w} height={size.h} aria-hidden>
        <defs>
          <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
          </marker>
        </defs>
        {links.map((l) => {
          const on = related ? related.has(l.from) && related.has(l.to) : false;
          return (
            <path key={l.id} d={l.d} fill="none" stroke={on ? "var(--ink)" : "var(--line-2)"} strokeWidth={on ? 1.8 : 1.2} style={{ color: on ? "var(--ink)" : "var(--line-2)", opacity: related && !on ? 0.3 : 1 }} markerEnd="url(#arrow)" />
          );
        })}
      </svg>
      <div className="lineage">
        {cols.map((c) => {
          const items = assets.filter((a) => (a.layer || "origem") === c);
          return (
            <div key={c} className="lineage-col">
              <h5>
                {layerLabel[c]} <span>{items.length}</span>
              </h5>
              {items.map((a) => (
                <div
                  key={a.id}
                  data-node={a.id}
                  className={`lineage-node ${related?.has(a.id) ? "hl" : related ? "dim" : ""}`}
                  onMouseEnter={() => setHover(a.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onOpen(a)}
                >
                  <div style={{ fontWeight: 500 }}>{a.name}</div>
                  <div className="meta">
                    {typeLabel[a.asset_type]}
                    {a.upstream?.length ? ` · ← ${a.upstream.length}` : ""}
                    {a.owner ? "" : " · sem owner"}
                  </div>
                </div>
              ))}
              {!items.length && <div className="xs muted" style={{ padding: "8px 2px" }}>—</div>}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
type ImportAsset = Partial<DataAsset> & { name: string; asset_type: DataAsset["asset_type"] };
type ImportCred = Partial<CredentialRecord> & { name: string; asset_name?: string | null };

function ImportModal({ orgId, existing, context, onClose, onImport }: { orgId: string; existing: DataAsset[]; context: unknown; onClose: () => void; onImport: (a: DataAsset[], c: (CredentialRecord & { asset_name?: string | null })[]) => Promise<void> }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ assets: ImportAsset[]; credentials: ImportCred[]; warnings: { severity: string; message: string }[] } | null>(null);
  const [selA, setSelA] = useState<Set<number>>(new Set());
  const [selC, setSelC] = useState<Set<number>>(new Set());

  async function run() {
    setBusy(true);
    try {
      const { output } = await callSkill<NonNullable<typeof res>>("catalog-assist", { narrative: text, existing_assets: existing.map((a) => a.name), context });
      const validTypes = new Set(ASSET_TYPES.map((t) => t.key));
      const assets = (output.assets || []).filter((a) => a.name && validTypes.has(a.asset_type));
      setRes({ assets, credentials: output.credentials || [], warnings: output.warnings || [] });
      setSelA(new Set(assets.map((_, i) => i)));
      setSelC(new Set((output.credentials || []).map((_, i) => i)));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro na IA", "err");
    } finally {
      setBusy(false);
    }
  }

  const toggle = (set: Set<number>, i: number, fn: (s: Set<number>) => void) => {
    const n = new Set(set);
    if (n.has(i)) n.delete(i);
    else n.add(i);
    fn(n);
  };

  return (
    <Modal
      eyebrow={<span className="row" style={{ gap: 8 }}><AiMark size={11} /> Assistente do catálogo</span>}
      title="Mapear ativos a partir de um relato"
      onClose={onClose}
      footer={
        res ? (
          <>
            <button className="btn" onClick={() => setRes(null)}>
              Voltar
            </button>
            <button
              className="btn btn-primary"
              disabled={!selA.size && !selC.size}
              onClick={() =>
                onImport(
                  res.assets.filter((_, i) => selA.has(i)).map((a) => ({ ...blankAsset(orgId), ...a, id: uid(), organization_id: orgId, upstream: [], tags: a.tags || [] }) as DataAsset),
                  res.credentials.filter((_, i) => selC.has(i)).map((c) => ({ ...blankCred(orgId), ...c, id: uid(), organization_id: orgId, status: (c.status as CredentialRecord["status"]) || "desconhecida" })),
                )
              }
            >
              Adicionar {selA.size + selC.size} item(ns)
            </button>
          </>
        ) : (
          <>
            <span className="xs muted" style={{ marginRight: "auto" }}>
              Senhas/tokens são removidos antes do envio.
            </span>
            <button className="btn btn-primary" onClick={run} disabled={busy || text.trim().length < 30}>
              {busy ? <Spinner /> : <Sparkles size={14} />} Estruturar
            </button>
          </>
        )
      }
    >
      {!res ? (
        <>
          <p className="small muted" style={{ marginTop: 0 }}>
            Conte como os dados circulam hoje: sistemas, planilhas, quem atualiza, onde ficam, como são extraídos. Quanto mais concreto, melhor.
          </p>
          <textarea
            className="textarea"
            style={{ minHeight: 200 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex.: O ERP é o Winthor, banco Oracle na matriz. A VTEX a gente puxa pela API com a chave que a agência passou. O João da logística mantém uma planilha de fretes no Drive e atualiza toda sexta. O Power BI comercial lê um PostgreSQL que o script do Tiago alimenta…"
          />
        </>
      ) : (
        <div className="stack">
          {res.warnings.length > 0 &&
            res.warnings.map((w, i) => (
              <div key={i} className={`callout ${w.severity === "alta" ? "risk" : ""}`}>
                {w.message}
              </div>
            ))}
          <div>
            <p className="section-title">Ativos ({res.assets.length})</p>
            {res.assets.map((a, i) => (
              <label key={i} className="lib-item">
                <input type="checkbox" className="check" checked={selA.has(i)} onChange={() => toggle(selA, i, setSelA)} />
                <div className="grow">
                  <div style={{ fontWeight: 500 }}>{a.name}</div>
                  <div className="xs muted">
                    {[typeLabel[a.asset_type], a.system, a.domain && domLabel[a.domain], a.layer && layerLabel[a.layer], a.sensitivity && sensLabel[a.sensitivity], a.refresh_frequency].filter(Boolean).join(" · ")}
                  </div>
                  {a.description && <div className="small" style={{ marginTop: 3 }}>{a.description}</div>}
                </div>
              </label>
            ))}
          </div>
          {res.credentials.length > 0 && (
            <div>
              <p className="section-title">Credenciais ({res.credentials.length})</p>
              {res.credentials.map((c, i) => (
                <label key={i} className="lib-item">
                  <input type="checkbox" className="check" checked={selC.has(i)} onChange={() => toggle(selC, i, setSelC)} />
                  <div className="grow">
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div className="xs muted">{[c.credential_type, c.holder, c.status && credLabel[c.status], c.asset_name && `→ ${c.asset_name}`].filter(Boolean).join(" · ")}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
