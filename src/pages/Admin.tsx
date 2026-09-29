import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useOrg } from "../context/org";
import { useAuth } from "../context/auth";
import { useToast } from "../context/toast";
import { useRows } from "../lib/useRows";
import { store, uid } from "../lib/store";
import { relTime } from "../lib/format";
import { DIMENSIONS, SEGMENTS, SIZE_BANDS, bandForScore } from "../model/framework";
import { scoreAssessment } from "../model/scoring";
import type { Assessment, Organization } from "../model/types";
import { Bar, Drawer, Empty, Field, LevelPill, LoadingPage, Metrics, PageHead, StatusBadge, Tabs } from "../components/ui";
import AdminUsers from "./AdminUsers";
import { MatrixHeatmap } from "../components/charts";

type Tab = "carteira" | "comparativo" | "usuarios";

export default function Admin() {
  const { reloadOrgs, setOrgId } = useOrg();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const orgs = useRows("organizations", null, { all: true });
  const assessments = useRows("assessments", null, { all: true });
  const kpis = useRows("kpis", null, { all: true });
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "carteira";
  const setTab = (t: Tab) => setParams(t === "carteira" ? {} : { tab: t });
  const [edit, setEdit] = useState<Organization | null>(null);
  const blankOrg = (): Organization => ({ id: "", name: "", segment: null, size: null, city: null, contact_name: null, contact_email: null, status: "ativo", notes: null });
  useEffect(() => {
    if (params.get("novo") === "1") {
      setEdit(blankOrg());
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const rows = useMemo(() => {
    return orgs.rows
      .map((o) => {
        const list = assessments.rows.filter((a) => a.organization_id === o.id);
        const latest = list[0] as Assessment | undefined;
        const s = latest ? scoreAssessment(latest) : null;
        return {
          o,
          latest,
          s,
          count: list.length,
          kpis: kpis.rows.filter((k) => k.organization_id === o.id).length,
          activity: [o.updated_at, latest?.updated_at].filter(Boolean).sort().pop(),
        };
      })
      .sort((a, b) => String(b.activity || "").localeCompare(String(a.activity || "")));
  }, [orgs.rows, assessments.rows, kpis.rows]);

  if (orgs.loading || assessments.loading) return <LoadingPage />;

  const active = rows.filter((r) => r.o.status === "ativo");
  const scored = rows.filter((r) => r.s?.overall !== null && r.s?.overall !== undefined);
  const avg = scored.length ? scored.reduce((acc, r) => acc + (r.s!.overall as number), 0) / scored.length : null;
  const avgBand = bandForScore(avg);
  const noAssessment = rows.filter((r) => !r.latest).length;
  const done = assessments.rows.filter((a) => a.status === "concluido").length;

  const openOrg = (id: string) => {
    setOrgId(id);
    nav("/");
  };

  return (
    <>
      <PageHead
        eyebrow="Moulis Advisory"
        title="Clientes"
        desc="Carteira, andamento dos diagnósticos e acessos."
        actions={
          <button className="btn btn-primary" onClick={() => setEdit(blankOrg())}>
            <Plus size={16} /> Novo cliente
          </button>
        }
      />

      <div style={{ marginBottom: 24 }}>
        <Metrics
          items={[
            { label: "Clientes ativos", value: active.length },
            { label: "Maturidade média", value: avg === null ? "—" : Math.round(avg), hint: avgBand ? `Nível ${avgBand.level} · ${avgBand.label}` : undefined },
            { label: "Diagnósticos concluídos", value: done },
            { label: "Sem diagnóstico", value: noAssessment },
          ]}
        />
      </div>

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ key: "carteira", label: "Carteira", count: rows.length }, { key: "comparativo", label: "Comparativo" }, { key: "usuarios", label: "Usuários" }]} />

      {tab === "carteira" && (
        <div className="card">
          {!rows.length ? (
            <Empty icon={<Building2 size={20} />} title="Nenhum cliente cadastrado">
              Cadastre a primeira empresa para começar o diagnóstico.
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="table table-stack">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Diagnóstico</th>
                    <th style={{ width: 130 }}>Progresso</th>
                    <th>Score</th>
                    <th>Nível</th>
                    <th>KPIs</th>
                    <th>Atividade</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ o, latest, s, kpis: nk, activity }) => (
                    <tr key={o.id} className="click" onClick={() => openOrg(o.id)}>
                      <td className="c-main">
                        <div className="cell-title row" style={{ gap: 8 }}>
                          {o.name} {o.status !== "ativo" && <StatusBadge status={o.status} />}
                        </div>
                        <div className="cell-sub">{[o.segment, o.size].filter(Boolean).join(" · ") || "—"}</div>
                      </td>
                      <td data-label="Diagnóstico">{latest ? <StatusBadge status={latest.status} /> : <span className="badge badge-dashed">Não iniciado</span>}</td>
                      <td data-label="Progresso">
                        {s ? (
                          <div className="row">
                            <div className="grow">
                              <Bar value={s.progress * 100} thin brand />
                            </div>
                            <span className="xs muted num">{Math.round(s.progress * 100)}%</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="serif num c-score" data-label="Score" style={{ fontSize: 20 }}>
                        {s?.overall == null ? "—" : Math.round(s.overall)}
                      </td>
                      <td data-label="Nível">{s ? <LevelPill level={s.band?.level} light /> : "—"}</td>
                      <td className="num small" data-label="KPIs">{nk}</td>
                      <td className="small muted nowrap" data-label="Atividade">{relTime(activity)}</td>
                      <td className="c-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                          <button className="btn btn-ghost btn-sm btn-icon" title="Editar" onClick={() => setEdit(o)}>
                            <Pencil size={15} />
                          </button>
                          <button className="btn btn-ghost btn-sm btn-icon" title="Abrir" onClick={() => openOrg(o.id)}>
                            <ArrowUpRight size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "comparativo" && (
        <div className="card card-pad">
          <p className="small muted" style={{ marginTop: 0 }}>
            Último diagnóstico de cada cliente. D1–D8 = capacidades; OP = qualidade por área. Clique no nome para abrir.
          </p>
          {scored.length ? (
            <MatrixHeatmap
              cols={[...DIMENSIONS.map((d) => d.code), "OP", "Geral"]}
              rows={scored.map((r) => ({
                label: r.o.name,
                onClick: () => openOrg(r.o.id),
                values: [...r.s!.dims.map((d) => d.score), r.s!.operation, r.s!.overall],
              }))}
            />
          ) : (
            <Empty title="Nenhum diagnóstico pontuado ainda" />
          )}
          <div className="row wrap small muted" style={{ marginTop: 16, gap: 16 }}>
            {DIMENSIONS.map((d) => (
              <span key={d.key}>
                <span className="mono">{d.code}</span> {d.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {tab === "usuarios" && <AdminUsers embedded />}

      {edit && (
        <OrgDrawer
          org={edit}
          canDelete={isAdmin}
          onClose={() => setEdit(null)}
          onSave={async (o) => {
            const saved = await orgs.save({ ...o, id: o.id || uid() });
            await reloadOrgs();
            toast("Cliente salvo");
            setEdit(null);
            if (!o.id) setOrgId(saved.id);
          }}
          onDelete={async (id) => {
            await store.remove("organizations", id);
            await orgs.reload();
            await reloadOrgs();
            toast("Cliente removido");
            setEdit(null);
          }}
        />
      )}
    </>
  );
}

function OrgDrawer({ org, canDelete, onClose, onSave, onDelete }: { org: Organization; canDelete: boolean; onClose: () => void; onSave: (o: Organization) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [f, setF] = useState(org);
  const set = <K extends keyof Organization>(k: K, v: Organization[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Drawer
      eyebrow="Cliente"
      title={org.id ? org.name : "Novo cliente"}
      onClose={onClose}
      footer={
        <>
          {org.id && canDelete && (
            <button className="btn btn-danger btn-sm" style={{ marginRight: "auto" }} onClick={() => confirm(`Remover ${org.name} e TODOS os seus dados (assessments, catálogo, glossário)?`) && onDelete(org.id)}>
              <Trash2 size={14} /> Remover
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!f.name.trim()} onClick={() => onSave(f)}>
            Salvar
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Razão social / nome *" full>
          <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </Field>
        <Field label="Segmento">
          <select className="select" value={f.segment || ""} onChange={(e) => set("segment", e.target.value || null)}>
            <option value="">—</option>
            {(f.segment && !(SEGMENTS as readonly string[]).includes(f.segment) ? [f.segment, ...SEGMENTS] : [...SEGMENTS]).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Porte">
          <select className="select" value={f.size || ""} onChange={(e) => set("size", e.target.value || null)}>
            <option value="">—</option>
            {SIZE_BANDS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Cidade/UF">
          <input className="input" value={f.city || ""} onChange={(e) => set("city", e.target.value || null)} />
        </Field>
        <Field label="Status">
          <select className="select" value={f.status} onChange={(e) => set("status", e.target.value as Organization["status"])}>
            <option value="ativo">Ativo</option>
            <option value="pausado">Pausado</option>
            <option value="encerrado">Encerrado</option>
          </select>
        </Field>
        <Field label="Contato principal">
          <input className="input" value={f.contact_name || ""} onChange={(e) => set("contact_name", e.target.value || null)} />
        </Field>
        <Field label="E-mail do contato">
          <input className="input" type="email" value={f.contact_email || ""} onChange={(e) => set("contact_email", e.target.value || null)} />
        </Field>
        <Field label="Notas internas" full>
          <textarea className="textarea" value={f.notes || ""} onChange={(e) => set("notes", e.target.value || null)} />
        </Field>
      </div>
    </Drawer>
  );
}
