// Priorização das áreas: onde vale mais a pena estruturar primeiro (ganho × esforço).
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, GripVertical, Pencil, RotateCcw } from "lucide-react";
import { useOrg } from "../context/org";
import { useCopilot } from "../context/copilot";
import { useToast } from "../context/toast";
import { useRows } from "../lib/useRows";
import { uid } from "../lib/store";
import { useSortable } from "../lib/useSortable";
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
  effortLabel,
  effortWhy,
  finalOrder,
  type AreaInput,
  type AreaResult,
  type DriverValue,
  type ImpactMap,
} from "../model/impact";
import EffortGainChart from "../components/EffortGainChart";
import { AiMark, Drawer, Empty, Field, LoadingPage, PageHead, Spinner } from "../components/ui";

const short = (title: string) => title.split(" & ")[0];

export default function Prioritization() {
  const { org, orgId } = useOrg();
  const toast = useToast();
  const copilot = useCopilot();
  const assessments = useRows("assessments", orgId);
  const maps = useRows("impact_maps", orgId);
  const [edit, setEdit] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  // A lista muda na hora; o banco confirma em seguida (volta atrás se falhar).
  const [optimistic, setOptimistic] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  const latest = assessments.rows[0] ?? null;
  const map: ImpactMap | null = maps.rows[0] ?? null;
  const results = useMemo(() => analyzeAreas(latest, map), [latest, map]);
  const ordered = useMemo(() => finalOrder(results, optimistic ?? map?.manual_order), [results, optimistic, map?.manual_order]);
  const manual = !!(optimistic ?? map?.manual_order)?.length;
  const reorderRef = useRef<(keys: string[]) => void>(() => {});
  const sortable = useSortable(
    ordered.map((r) => r.domain.key),
    (keys) => reorderRef.current(keys),
  );

  const total = results.reduce((s, r) => ({ low: s.low + r.low, high: s.high + r.high }), { low: 0, high: 0 });
  const estimated = results.filter((r) => r.value > 0).length;
  const maxValue = Math.max(0, ...results.map((r) => r.value));
  const top = ordered.find((r) => r.value > 0) ?? null;
  const changed = manual ? ordered.filter((r, i) => r.suggestedRank !== i + 1).length : 0;

  useEffect(() => {
    if (!org || maps.loading) return;
    copilot.setFocus({
      tela: "Priorização das áreas (esforço × ganho)",
      areas: ordered.map((r, i) => ({
        ordem: i + 1,
        area: r.domain.title,
        quadrante: QUADRANTS[r.quadrant].label,
        ganho_anual_em_jogo: r.value ? brlRange(r.low, r.high) : null,
        esforco: effortLabel(r.effort),
        maturidade: r.maturity === null ? null : Math.round(r.maturity),
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

  const reorder = (keys: string[]) => {
    setOptimistic(keys);
    void persist({ manual_order: keys })
      .catch(() => {})
      .finally(() => setOptimistic(null));
  };
  reorderRef.current = reorder;
  const move = (key: string, to: number) => {
    const keys = ordered.map((r) => r.domain.key).filter((k) => k !== key);
    keys.splice(Math.max(0, Math.min(keys.length, to)), 0, key);
    sortable.snapshot();
    reorder(keys);
  };
  const backToSuggestion = () => {
    sortable.snapshot();
    setOptimistic([]);
    void persist({ manual_order: null, justifications: {} })
      .catch(() => {})
      .finally(() => setOptimistic(null));
  };

  const pick = (key: string) => {
    setOpenKey(key);
    setHot(key);
    requestAnimationFrame(() => document.getElementById(`pz-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    window.setTimeout(() => setHot((h) => (h === key ? null : h)), 1800);
  };

  const editing = edit ? results.find((r) => r.domain.key === edit) : null;

  return (
    <>
      <PageHead
        eyebrow={org.name}
        title="Priorização das áreas"
        desc="A área com pior maturidade nem sempre é a que traz mais resultado. Veja o ganho que cada área pode trazer contra o esforço para estruturá-la, e decida a ordem de ataque."
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

      {/* Recomendação */}
      <section className="pz-reco">
        <div className="pz-reco-main">
          <span className="pz-kicker">{manual ? "Primeira da sua ordem" : "Comece por"}</span>
          {top ? (
            <>
              <h2 className="pz-reco-title">{short(top.domain.title)}</h2>
              <p className="pz-reco-sub">
                Ganho de <b>{brlRange(top.low, top.high)}</b> por ano, com esforço <b>{effortLabel(top.effort).toLowerCase()}</b> ({effortWhy(top)}).
              </p>
              <span className={`pz-q pz-q-${top.quadrant}`}>{QUADRANTS[top.quadrant].label}</span>
            </>
          ) : (
            <>
              <h2 className="pz-reco-title">Estime o ganho das áreas</h2>
              <p className="pz-reco-sub">Escolha a faixa mais próxima de receita, verba, frete, folha… Começa pelas áreas que você conhece melhor.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setEdit(results[0]?.domain.key ?? null)}>
                <Pencil size={13} /> Estimar a primeira área
              </button>
            </>
          )}
        </div>
        <div className="pz-reco-side">
          <div>
            <span className="pz-kicker">Ganho anual em jogo</span>
            <b className="pz-reco-total">{total.high ? brlRange(total.low, total.high) : "—"}</b>
          </div>
          <div>
            <span className="pz-kicker">
              Áreas estimadas · {estimated} de {results.length}
            </span>
            <div className="pz-progress">
              <span style={{ width: `${results.length ? (estimated / results.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* Gráfico */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <h3 className="card-title">Esforço × ganho</h3>
            <p className="card-sub">Cada bolha é uma área. Quanto mais alto, mais ganho; quanto mais à esquerda, menos esforço.</p>
          </div>
        </div>
        <div className="card-body">
          <EffortGainChart ordered={ordered} hot={hot} onHot={setHot} onPick={pick} onEstimate={setEdit} />
        </div>
      </section>

      {/* Ordem */}
      <section className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Ordem de ataque</h3>
            <p className="card-sub">Arraste pela alça ⠿ ou use as setas. Clique na área para ver de onde vem o ganho.</p>
          </div>
          <span className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {saving && <Spinner />}
            <span className={`pz-mode ${manual ? "manual" : ""}`}>{manual ? `Ordem decidida${changed ? ` · ${changed} mudança${changed > 1 ? "s" : ""}` : ""}` : "Sugestão do app"}</span>
            {manual && (
              <button className="btn btn-sm" onClick={backToSuggestion}>
                <RotateCcw size={14} /> Voltar à sugestão
              </button>
            )}
          </span>
        </div>
        <div className="card-body">
          <ol className="pz-rows">
            {ordered.map((r, i) => (
              <AreaRow
                key={r.domain.key}
                r={r}
                rank={i + 1}
                last={i === ordered.length - 1}
                manual={manual}
                maxValue={maxValue}
                open={openKey === r.domain.key}
                hot={hot === r.domain.key}
                dragging={sortable.dragKey === r.domain.key}
                style={sortable.styleFor(r.domain.key)}
                liRef={sortable.register(r.domain.key)}
                onGripDown={sortable.start(r.domain.key)}
                justification={map?.justifications?.[r.domain.key] || ""}
                onToggle={() => setOpenKey(openKey === r.domain.key ? null : r.domain.key)}
                onHot={(on) => setHot(on ? r.domain.key : null)}
                onUp={() => move(r.domain.key, i - 1)}
                onDown={() => move(r.domain.key, i + 1)}
                onEdit={() => setEdit(r.domain.key)}
                onJustify={(text) => void persist({ justifications: { ...(map?.justifications || {}), [r.domain.key]: text } }).catch(() => {})}
              />
            ))}
          </ol>
          <p className="xs muted" style={{ marginTop: 14 }}>
            Ganho = ponto médio de cada faixa × uma parcela recuperável conservadora (mostrada em cada campo). Esforço = quanto falta de maturidade e de patrocínio na área. É ordem de grandeza para comparar áreas, não promessa de ganho.
          </p>
        </div>
      </section>

      {editing && (
        <AreaDrawer
          key={editing.domain.key}
          r={editing}
          all={ordered}
          onClose={() => setEdit(null)}
          onSave={async (input, after) => {
            await persist({ areas: { ...(map?.areas || {}), [editing.domain.key]: input } });
            toast("Valores salvos");
            setEdit(after ?? null);
          }}
          onJump={setEdit}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------
function Meter({ label, value, text, kind }: { label: string; value: number; text: string; kind: "gain" | "effort" }) {
  return (
    <div className={`pz-meter pz-meter-${kind}`}>
      <div className="pz-meter-top">
        <span>{label}</span>
        <b>{text}</b>
      </div>
      <div className="pz-bar">
        <span style={{ width: `${Math.max(3, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function AreaRow(props: {
  r: AreaResult;
  rank: number;
  last: boolean;
  manual: boolean;
  maxValue: number;
  open: boolean;
  hot: boolean;
  dragging: boolean;
  style?: CSSProperties;
  liRef: (el: HTMLElement | null) => void;
  onGripDown: (e: ReactPointerEvent<HTMLElement>) => void;
  justification: string;
  onToggle: () => void;
  onHot: (on: boolean) => void;
  onUp: () => void;
  onDown: () => void;
  onEdit: () => void;
  onJustify: (text: string) => void;
}) {
  const { r, rank } = props;
  const [just, setJust] = useState(props.justification);
  useEffect(() => setJust(props.justification), [props.justification]);
  const delta = props.manual ? r.suggestedRank - rank : 0; // > 0: subiu em relação à sugestão
  const q = QUADRANTS[r.quadrant];
  const filled = r.drivers.filter((d) => d.base !== null);

  return (
    <li
      id={`pz-${r.domain.key}`}
      ref={props.liRef}
      style={props.style}
      className={`pz-row ${props.open ? "open" : ""} ${props.hot ? "hot" : ""} ${props.dragging ? "dragging" : ""}`}
      onMouseEnter={() => props.onHot(true)}
      onMouseLeave={() => props.onHot(false)}
    >
      <div className="pz-row-main">
        <button type="button" className="pz-grip no-print" aria-label={`Arrastar ${r.domain.title} para reordenar`} title="Arraste para reordenar" onPointerDown={props.onGripDown}>
          <GripVertical size={18} />
        </button>
        <span className="pz-rank">{rank}</span>
        <button type="button" className="pz-row-title" onClick={props.onToggle} aria-expanded={props.open}>
          <span className="pz-name">{r.domain.title}</span>
          <span className="pz-sub">
            <span className={`pz-q pz-q-${r.quadrant}`}>{q.label}</span>
            {delta !== 0 && (
              <span className={`pz-delta ${delta > 0 ? "up" : "down"}`} title={`Sugestão do app: ${r.suggestedRank}º`}>
                {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
              </span>
            )}
          </span>
        </button>
        <div className="pz-meters">
          <Meter label="Ganho" kind="gain" value={props.maxValue ? (r.value / props.maxValue) * 100 : 0} text={r.value ? brlRange(r.low, r.high) : "Sem estimativa"} />
          <Meter label="Esforço" kind="effort" value={r.effort} text={effortLabel(r.effort)} />
        </div>
        <div className="pz-moves no-print">
          <button className="btn btn-icon btn-sm btn-ghost" disabled={rank === 1} onClick={props.onUp} aria-label="Subir">
            <ArrowUp size={15} />
          </button>
          <button className="btn btn-icon btn-sm btn-ghost" disabled={props.last} onClick={props.onDown} aria-label="Descer">
            <ArrowDown size={15} />
          </button>
          <button className="btn btn-icon btn-sm btn-ghost pz-chev" onClick={props.onToggle} aria-label={props.open ? "Fechar detalhes" : "Abrir detalhes"}>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {delta !== 0 && (
        <div className="pz-just no-print">
          <input
            className="input"
            placeholder={`Por que ${delta > 0 ? "subiu" : "desceu"}? (a sugestão era ${r.suggestedRank}º)`}
            value={just}
            onChange={(e) => setJust(e.target.value)}
            onBlur={() => just !== props.justification && props.onJustify(just)}
          />
        </div>
      )}
      {delta === 0 && props.justification && <p className="small muted pz-just-text">{props.justification}</p>}

      {props.open && (
        <div className="pz-detail">
          <div className="pz-d-box">
            <h5>De onde vem o ganho</h5>
            {filled.length ? (
              <ul>
                {filled.map((d) => (
                  <li key={d.driver.key}>
                    <span>{d.driver.label}</span>
                    <b>{brlRange(d.low, d.high)}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">Nenhum valor preenchido ainda.</p>
            )}
          </div>
          <div className="pz-d-box">
            <h5>Por que este esforço</h5>
            <p className="small">{effortWhy(r)}</p>
            <p className="xs muted">
              {r.answered ? `${r.answered} de ${r.total} perguntas da área respondidas` : "Ainda não respondida no diagnóstico"}
              {r.input.estrategia ? ` · estratégia: ${STRATEGY_LABELS[r.input.estrategia].toLowerCase()}` : ""}
            </p>
            {r.input.nota && <p className="small">{r.input.nota}</p>}
          </div>
          <div className="pz-d-actions no-print">
            <button className="btn btn-sm btn-primary" onClick={props.onEdit}>
              <Pencil size={13} /> {r.filled ? "Editar valores" : "Estimar valor"}
            </button>
          </div>
        </div>
      )}
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

function AreaDrawer({ r, all, onClose, onSave, onJump }: { r: AreaResult; all: AreaResult[]; onClose: () => void; onSave: (i: AreaInput, after?: string) => Promise<void>; onJump: (key: string) => void }) {
  const [f, setF] = useState<AreaInput>(r.input);
  const [busy, setBusy] = useState(false);
  const activeChip = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeChip.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);
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

  const idx = all.findIndex((x) => x.domain.key === r.domain.key);
  const next = all[idx + 1];
  const dirty = JSON.stringify(f) !== JSON.stringify(r.input);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      /* mensagem já exibida */
    } finally {
      setBusy(false);
    }
  };
  // Trocar de área salva o que foi digitado, para não perder nada.
  const jump = (key: string) => run(async () => (dirty ? onSave(f, key) : onJump(key)));

  return (
    <Drawer
      wide
      eyebrow="Priorização · valores em faixas"
      title={r.domain.title}
      onClose={onClose}
      footer={
        <>
          <span className="small" style={{ marginRight: "auto" }}>
            Ganho anual: <b>{high ? brlRange(low, high) : "—"}</b>
          </span>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className={`btn ${next ? "" : "btn-primary"}`} disabled={busy} onClick={() => run(() => onSave(f))}>
            {busy ? <Spinner /> : "Salvar"}
          </button>
          {next && (
            <button className="btn btn-primary" disabled={busy} onClick={() => run(() => onSave(f, next.domain.key))}>
              Salvar e ir para {short(next.domain.title)} <ArrowRight size={14} />
            </button>
          )}
        </>
      }
    >
      <div className="pz-hop" role="tablist" aria-label="Áreas">
        {all.map((x) => (
          <button key={x.domain.key} ref={x.domain.key === r.domain.key ? activeChip : undefined} role="tab" aria-selected={x.domain.key === r.domain.key} className={`pz-hop-chip ${x.domain.key === r.domain.key ? "on" : ""}`} disabled={busy} onClick={() => x.domain.key !== r.domain.key && jump(x.domain.key)}>
            {x.value > 0 && x.domain.key !== r.domain.key && <Check size={11} />}
            {short(x.domain.title)}
          </button>
        ))}
      </div>

      <p className="small muted" style={{ margin: "14px 0 0" }}>
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
                  <BandSelect bands={PEOPLE_BANDS} value={typeof v === "object" ? v.p : undefined} onChange={(x) => setDriver(d.key, { ...(typeof v === "object" ? v : {}), p: x })} placeholder="Pessoas na área" />
                  <BandSelect bands={SALARY_BANDS} value={typeof v === "object" ? v.c : undefined} onChange={(x) => setDriver(d.key, { ...(typeof v === "object" ? v : {}), c: x })} placeholder="Custo médio por pessoa (com encargos)" />
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
      <Field label="A área tem um patrocinador que cobra o resultado?" hint="Com patrocinador, o esforço da área cai.">
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
