// Priorização das áreas: valor em jogo × prontidão, com ordem sugerida e ordem decidida.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Flag, GripVertical, Pencil, RotateCcw, Target } from "lucide-react";
import { useOrg } from "../context/org";
import { useCopilot } from "../context/copilot";
import { useToast } from "../context/toast";
import { useRows } from "../lib/useRows";
import { uid } from "../lib/store";
import { friendlyError } from "../lib/errors";
import {
  MONEY_BANDS,
  PEOPLE_BANDS,
  QUADRANTS,
  SALARY_BANDS,
  SPONSOR_OPTIONS,
  STRATEGY_LABELS,
  analyzeAreas,
  brl,
  brlRange,
  driverResult,
  driversFor,
  finalOrder,
  type AreaInput,
  type AreaResult,
  type DriverValue,
  type ImpactMap,
  type Quadrant,
} from "../model/impact";
import { AiMark, Bar, Drawer, Empty, Field, LoadingPage, Metrics, PageHead, Spinner } from "../components/ui";

export default function Prioritization() {
  const { org, orgId } = useOrg();
  const toast = useToast();
  const copilot = useCopilot();
  const assessments = useRows("assessments", orgId);
  const maps = useRows("impact_maps", orgId);
  const [edit, setEdit] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const latest = assessments.rows[0] ?? null;
  const map: ImpactMap | null = maps.rows[0] ?? null;
  const results = useMemo(() => analyzeAreas(latest, map), [latest, map]);
  const ordered = useMemo(() => finalOrder(results, map?.manual_order), [results, map?.manual_order]);
  const manual = !!map?.manual_order?.length;

  const total = results.reduce((s, r) => ({ low: s.low + r.low, high: s.high + r.high }), { low: 0, high: 0 });
  const estimated = results.filter((r) => r.value > 0).length;

  useEffect(() => {
    if (!org || maps.loading) return;
    copilot.setFocus({
      tela: "Priorização das áreas",
      areas: ordered.map((r, i) => ({
        ordem: i + 1,
        area: r.domain.title,
        quadrante: QUADRANTS[r.quadrant].label,
        valor_anual_em_jogo: r.value ? brlRange(r.low, r.high) : null,
        maturidade: r.maturity === null ? null : Math.round(r.maturity),
        prontidao: r.readiness,
        ordem_sugerida: r.suggestedRank,
        justificativa: map?.justifications?.[r.domain.key] || null,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, maps.loading, ordered]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => copilot.setFocus(null), []);

  if (assessments.loading || maps.loading) return <LoadingPage />;
  if (!orgId || !org) return <Empty title="Selecione uma empresa" />;

  const persist = async (patch: Partial<ImpactMap>) => {
    setSaving(true);
    try {
      await maps.save({ id: map?.id || uid(), organization_id: orgId, areas: map?.areas || {}, manual_order: map?.manual_order ?? null, justifications: map?.justifications || {}, ...patch });
    } catch (e) {
      toast(friendlyError(e, "Não foi possível salvar"), "err");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const move = (key: string, to: number) => {
    const keys = ordered.map((r) => r.domain.key).filter((k) => k !== key);
    keys.splice(Math.max(0, Math.min(keys.length, to)), 0, key);
    void persist({ manual_order: keys }).catch(() => {});
  };

  const editing = edit ? results.find((r) => r.domain.key === edit) : null;

  return (
    <>
      <PageHead
        eyebrow={org.name}
        title="Priorização das áreas"
        desc="A área com pior maturidade nem sempre é a que traz mais resultado. Aqui cruzamos o valor que cada área movimenta com as condições de executar — e decidimos a ordem de ataque."
        actions={
          <button className="btn btn-ai" onClick={() => copilot.ask("Com base na priorização das áreas, redija um resumo para a diretoria: qual área atacar primeiro, por quê, o ganho estimado e o que precisa estar pronto antes.", "Resumo da priorização")}>
            <AiMark size={11} /> Resumo para a diretoria
          </button>
        }
      />

      {!latest && (
        <div className="callout-soft" style={{ marginBottom: 16 }}>
          Ainda não há diagnóstico para esta empresa: a maturidade das áreas entra como desconhecida. <Link to="/assessments">Começar o diagnóstico</Link>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <Metrics
          items={[
            { label: "Valor anual em jogo", value: total.high ? brlRange(total.low, total.high) : "—", hint: "Soma das estimativas das áreas" },
            { label: "Áreas estimadas", value: `${estimated} de ${results.length}` },
            { label: "Atacar primeiro", value: ordered[0]?.value ? ordered[0].domain.title.split(" & ")[0] : "—" },
          ]}
        />
      </div>

      {/* Matriz */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <h3 className="card-title">Matriz de prioridade</h3>
            <p className="card-sub">Valor em jogo (alto ou baixo, comparado às outras áreas da empresa) × prontidão para executar</p>
          </div>
        </div>
        <div className="card-body">
          <div className="pz-matrix">
            <span className="pz-axis-y">Valor em jogo</span>
            <span className="pz-axis-x">Prontidão para executar</span>
            {(["preparar", "atacar", "depois", "rapido"] as Quadrant[]).map((q) => {
              const items = ordered.filter((r) => r.quadrant === q);
              return (
                <div key={q} className={`pz-quad pz-${q}`}>
                  <div className="pz-quad-head">
                    <b>{QUADRANTS[q].label}</b>
                    <span>{QUADRANTS[q].hint}</span>
                  </div>
                  <div className="pz-chips">
                    {items.length ? (
                      items.map((r) => (
                        <button key={r.domain.key} className="pz-chip" onClick={() => setEdit(r.domain.key)}>
                          <span className="pz-chip-n">{ordered.indexOf(r) + 1}</span>
                          {r.domain.title.split(" & ")[0]}
                        </button>
                      ))
                    ) : (
                      <span className="xs muted">Nenhuma área</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {results.some((r) => r.quadrant === "sem_dados") && (
            <p className="small muted" style={{ marginTop: 12 }}>
              <b>Sem estimativa:</b>{" "}
              {results
                .filter((r) => r.quadrant === "sem_dados")
                .map((r) => r.domain.title.split(" & ")[0])
                .join(", ")}{" "}
              — preencha os valores para posicionar.
            </p>
          )}
        </div>
      </section>

      {/* Ordem */}
      <section className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Ordem de ataque</h3>
            <p className="card-sub">{manual ? "Ordem decidida pela gestão. Arraste ou use as setas para mudar." : "Sugestão do app pelo valor esperado. Arraste ou use as setas para decidir a ordem final."}</p>
          </div>
          <span className="row" style={{ gap: 8 }}>
            {saving && <Spinner />}
            {manual && (
              <button className="btn btn-sm btn-ghost" onClick={() => void persist({ manual_order: null }).catch(() => {})}>
                <RotateCcw size={14} /> Voltar à sugestão do app
              </button>
            )}
          </span>
        </div>
        <div className="card-body">
          <ol className="pz-list">
            {ordered.map((r, i) => (
              <AreaCard
                key={r.domain.key}
                r={r}
                rank={i + 1}
                last={i === ordered.length - 1}
                manual={manual}
                justification={map?.justifications?.[r.domain.key] || ""}
                dragging={dragKey === r.domain.key}
                onDragStart={() => setDragKey(r.domain.key)}
                onDragEnd={() => setDragKey(null)}
                onDropHere={() => {
                  if (dragKey && dragKey !== r.domain.key) move(dragKey, i);
                  setDragKey(null);
                }}
                onUp={() => move(r.domain.key, i - 1)}
                onDown={() => move(r.domain.key, i + 1)}
                onEdit={() => setEdit(r.domain.key)}
                onJustify={(text) => void persist({ justifications: { ...(map?.justifications || {}), [r.domain.key]: text } }).catch(() => {})}
              />
            ))}
          </ol>
          <p className="xs muted" style={{ marginTop: 14 }}>
            Valores são estimativas de ordem de grandeza: ponto médio de cada faixa × uma parcela recuperável conservadora (mostrada em cada campo). Use para comparar áreas, não como promessa de ganho.
          </p>
        </div>
      </section>

      {editing && (
        <AreaDrawer
          r={editing}
          onClose={() => setEdit(null)}
          onSave={async (input) => {
            await persist({ areas: { ...(map?.areas || {}), [editing.domain.key]: input } });
            toast("Valores da área salvos");
            setEdit(null);
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------
function AreaCard(props: {
  r: AreaResult;
  rank: number;
  last: boolean;
  manual: boolean;
  justification: string;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropHere: () => void;
  onUp: () => void;
  onDown: () => void;
  onEdit: () => void;
  onJustify: (text: string) => void;
}) {
  const { r, rank } = props;
  const [just, setJust] = useState(props.justification);
  useEffect(() => setJust(props.justification), [props.justification]);
  const moved = props.manual && r.suggestedRank !== rank;
  const q = QUADRANTS[r.quadrant];
  return (
    <li
      className={`pz-card ${props.dragging ? "dragging" : ""}`}
      draggable
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        props.onDropHere();
      }}
    >
      <div className="pz-card-head">
        <span className="pz-grip no-print" aria-hidden>
          <GripVertical size={16} />
        </span>
        <span className="pz-rank">{rank}</span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="pz-title">{r.domain.title}</div>
          <div className="pz-sub">
            <span className={`pz-q pz-q-${r.quadrant}`}>{q.label}</span>
            {moved && <span className="xs muted">sugestão do app: {r.suggestedRank}º</span>}
          </div>
        </div>
        <div className="pz-moves no-print">
          <button className="btn btn-icon btn-sm btn-ghost" disabled={rank === 1} onClick={props.onUp} aria-label="Subir">
            <ArrowUp size={15} />
          </button>
          <button className="btn btn-icon btn-sm btn-ghost" disabled={props.last} onClick={props.onDown} aria-label="Descer">
            <ArrowDown size={15} />
          </button>
        </div>
      </div>

      <div className="pz-boxes">
        <div className="pz-box">
          <span className="pz-lbl">
            <Target size={12} /> Valor anual em jogo
          </span>
          <b className="pz-big">{r.value ? brlRange(r.low, r.high) : "—"}</b>
          <span className="xs muted">{r.filled ? `${r.filled} campo${r.filled > 1 ? "s" : ""} estimado${r.filled > 1 ? "s" : ""}` : "Nenhum valor preenchido"}</span>
        </div>
        <div className="pz-box">
          <span className="pz-lbl">Maturidade da área</span>
          <b className="pz-big">{r.maturity === null ? "—" : Math.round(r.maturity)}</b>
          <Bar value={r.maturity} thin />
          <span className="xs muted">{r.answered ? `${r.answered} de ${r.total} respondidas` : "Ainda não respondida no diagnóstico"}</span>
        </div>
        <div className="pz-box">
          <span className="pz-lbl">
            <Flag size={12} /> Prontidão
          </span>
          <b className="pz-big">{r.readiness}</b>
          <Bar value={r.readiness} thin brand />
          <span className="xs muted">
            Patrocinador: {SPONSOR_OPTIONS.find((s) => s.key === r.input.patrocinador)?.label.toLowerCase() ?? "não informado"}
            {r.input.estrategia ? ` · estratégia ${STRATEGY_LABELS[r.input.estrategia].toLowerCase()}` : ""}
          </span>
        </div>
      </div>

      {moved && (
        <div className="pz-just no-print">
          <input
            className="input"
            placeholder="Por que esta área ficou nesta posição? (ex.: maior reflexo em receita no trimestre)"
            value={just}
            onChange={(e) => setJust(e.target.value)}
            onBlur={() => just !== props.justification && props.onJustify(just)}
          />
        </div>
      )}
      {!moved && props.justification && <p className="small muted" style={{ margin: "8px 0 0" }}>{props.justification}</p>}
      {r.input.nota && <p className="small" style={{ margin: "8px 0 0" }}>{r.input.nota}</p>}

      <div className="pz-actions no-print">
        <button className="btn btn-sm" onClick={props.onEdit}>
          <Pencil size={13} /> {r.filled ? "Editar valores" : "Estimar valor"}
        </button>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------
function BandSelect({ bands, value, onChange, placeholder }: { bands: { v: number; label: string }[]; value?: number; onChange: (v: number | undefined) => void; placeholder: string }) {
  return (
    <select className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}>
      <option value="">{placeholder}</option>
      {bands.map((b) => (
        <option key={b.v} value={b.v}>
          {b.label}
        </option>
      ))}
    </select>
  );
}

const pct = (x: number) => `${(x * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

function AreaDrawer({ r, onClose, onSave }: { r: AreaResult; onClose: () => void; onSave: (i: AreaInput) => Promise<void> }) {
  const [f, setF] = useState<AreaInput>(r.input);
  const [busy, setBusy] = useState(false);
  const drivers = driversFor(r.domain.key);
  const setDriver = (k: string, v: DriverValue | undefined) =>
    setF((x) => {
      const d = { ...(x.drivers || {}) };
      if (v === undefined) delete d[k];
      else d[k] = v;
      return { ...x, drivers: d };
    });
  const results = drivers.map((d) => driverResult(d, f.drivers?.[d.key]));
  const low = results.reduce((s, x) => s + x.low, 0);
  const high = results.reduce((s, x) => s + x.high, 0);

  return (
    <Drawer
      wide
      eyebrow="Priorização · valores em faixas"
      title={r.domain.title}
      onClose={onClose}
      footer={
        <>
          <span className="small" style={{ marginRight: "auto" }}>
            Valor anual em jogo: <b>{high ? brlRange(low, high) : "—"}</b>
          </span>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(f);
              } catch {
                /* mensagem já exibida */
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
      <p className="small muted" style={{ marginTop: 0 }}>
        Escolha a faixa mais próxima — não precisa de número exato. Deixe em branco o que não souber.
      </p>

      <div className="pz-section">Quanto a área movimenta</div>
      <div className="stack" style={{ gap: 12 }}>
        {drivers.map((d, i) => {
          const res = results[i];
          const v = f.drivers?.[d.key];
          return (
            <div key={d.key} className="pz-field">
              <div className="pz-field-head">
                <b>{d.label}</b>
                {d.hint && <span className="xs muted">{d.hint}</span>}
              </div>
              {d.kind === "money" ? (
                <BandSelect bands={MONEY_BANDS} value={typeof v === "number" ? v : undefined} onChange={(x) => setDriver(d.key, x)} placeholder="Não sei / não se aplica" />
              ) : (
                <div className="form-grid">
                  <BandSelect
                    bands={PEOPLE_BANDS}
                    value={typeof v === "object" ? v.p : undefined}
                    onChange={(x) => setDriver(d.key, { ...(typeof v === "object" ? v : {}), p: x })}
                    placeholder="Pessoas na área"
                  />
                  <BandSelect
                    bands={SALARY_BANDS}
                    value={typeof v === "object" ? v.c : undefined}
                    onChange={(x) => setDriver(d.key, { ...(typeof v === "object" ? v : {}), c: x })}
                    placeholder="Custo médio por pessoa (com encargos)"
                  />
                </div>
              )}
              <div className="pz-field-foot">
                <span>
                  Ganho estimado: {pct(d.lever[0])} a {pct(d.lever[1])} — {d.why}
                </span>
                {res.base !== null && <b>{brlRange(res.low, res.high)}/ano</b>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pz-section">Condições para executar</div>
      <Field label="Importância na estratégia da diretoria">
        <div className="chips">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={`chip ${f.estrategia === n ? "on" : ""}`} onClick={() => setF((x) => ({ ...x, estrategia: x.estrategia === n ? undefined : n }))}>
              {n} · {STRATEGY_LABELS[n]}
            </button>
          ))}
        </div>
      </Field>
      <div style={{ height: 12 }} />
      <Field label="A área tem um patrocinador que cobra o resultado?">
        <div className="chips">
          {SPONSOR_OPTIONS.map((s) => (
            <button key={s.key} type="button" className={`chip ${f.patrocinador === s.key ? "on" : ""}`} onClick={() => setF((x) => ({ ...x, patrocinador: x.patrocinador === s.key ? undefined : s.key }))}>
              {s.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="pz-section">Acompanhamento</div>
      <div className="form-grid">
        <Field label="Retorno já medido depois das ações" hint="Preencha nas revisões trimestrais.">
          <BandSelect bands={MONEY_BANDS} value={f.retorno} onChange={(x) => setF((y) => ({ ...y, retorno: x }))} placeholder="Ainda não medido" />
        </Field>
        <Field label="Observação" full>
          <textarea className="textarea" value={f.nota || ""} onChange={(e) => setF((x) => ({ ...x, nota: e.target.value || undefined }))} placeholder="Ex.: diretoria quer margem por canal até o fim do trimestre." />
        </Field>
      </div>
      {f.retorno !== undefined && <p className="xs muted">Retorno medido: {MONEY_BANDS.find((b) => b.v === f.retorno)?.label} (referência: {brl(MONEY_BANDS.find((b) => b.v === f.retorno)?.mid || 0)}).</p>}
    </Drawer>
  );
}
