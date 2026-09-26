import { Fragment } from "react";
import { QUALITY_DIMS, toneFor, type OpDomain, type QualityDim } from "../model/framework";

/** Radar monocromático — até 10 eixos. */
export function Radar({ axes, size = 320, compare }: { axes: { label: string; value: number | null }[]; size?: number; compare?: (number | null)[] }) {
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 46;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r * (v / 100), cy + Math.sin(a) * r * (v / 100)];
  };
  const poly = (vals: (number | null)[]) => vals.map((v, i) => pt(i, v ?? 0).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} role="img" aria-label="Radar de maturidade por dimensão">
      {[20, 40, 60, 80, 100].map((g) => (
        <polygon key={g} points={poly(axes.map(() => g))} fill={g === 100 ? "var(--surface)" : "none"} stroke="var(--line)" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" />;
      })}
      {compare && <polygon points={poly(compare)} fill="none" stroke="var(--ink-4)" strokeDasharray="4 3" strokeWidth={1.5} />}
      <polygon points={poly(axes.map((a) => a.value))} fill="rgba(11,11,11,0.08)" stroke="var(--ink)" strokeWidth={1.8} strokeLinejoin="round" />
      {axes.map((a, i) => {
        const [x, y] = pt(i, a.value ?? 0);
        return <circle key={i} cx={x} cy={y} r={3.2} fill="var(--ink)" />;
      })}
      {axes.map((a, i) => {
        const [x, y] = pt(i, 122);
        const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
        return (
          <g key={a.label}>
            <text x={x} y={y - 2} textAnchor={anchor} fontSize={10.5} fill="var(--ink-3)" fontFamily="var(--mono)">
              {a.label}
            </text>
            <text x={x} y={y + 11} textAnchor={anchor} fontSize={12} fill="var(--ink)" fontWeight={600}>
              {a.value === null ? "—" : Math.round(a.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Anel de score geral. */
export function ScoreRing({ value, size = 128, label }: { value: number | null; size?: number; label?: string }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${Math.round(v)} de 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={stroke}
        strokeDasharray={`${(c * v) / 100} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray .4s ease" }}
      />
      <text x="50%" y="50%" dy={label ? -2 : 6} textAnchor="middle" fontFamily="var(--serif)" fontSize={size * 0.28} fill="var(--ink)">
        {value === null ? "—" : Math.round(v)}
      </text>
      {label && (
        <text x="50%" y="50%" dy={size * 0.17} textAnchor="middle" fontSize={10.5} fill="var(--ink-3)" letterSpacing="0.08em">
          {label}
        </text>
      )}
    </svg>
  );
}

/** Heatmap domínio × dimensão de qualidade. */
export function QualityHeatmap({ domains, matrix }: { domains: OpDomain[]; matrix: Record<string, Partial<Record<QualityDim, number | null>>> }) {
  const cols = QUALITY_DIMS;
  return (
    <div className="table-wrap">
      <div className="heat" style={{ gridTemplateColumns: `minmax(150px, 1.4fr) repeat(${cols.length}, minmax(64px, 1fr))`, minWidth: 620 }}>
        <div />
        {cols.map((c) => (
          <div key={c.key} className="heat-head" title={c.question}>
            {c.label}
          </div>
        ))}
        {domains.map((d) => (
          <Row key={d.key} d={d} cells={cols.map((c) => ({ key: c.key, v: matrix[d.key]?.[c.key], has: d.checks.some((k) => k.quality === c.key) }))} />
        ))}
      </div>
      <HeatLegend />
    </div>
  );
}

function Row({ d, cells }: { d: OpDomain; cells: { key: string; v: number | null | undefined; has: boolean }[] }) {
  return (
    <>
      <div className="heat-row-label">{d.title}</div>
      {cells.map((c) => {
        if (!c.has) return <div key={c.key} className="heat-cell" style={{ background: "transparent", border: "1px dashed var(--line)" }} />;
        const t = toneFor(c.v ?? null);
        return (
          <div key={c.key} className="heat-cell" style={{ background: t.bg, color: t.fg }}>
            {c.v === null || c.v === undefined ? "·" : Math.round(c.v)}
          </div>
        );
      })}
    </>
  );
}

export function HeatLegend() {
  const steps = [10, 30, 50, 70, 90];
  return (
    <div className="heat-legend" style={{ marginTop: 12 }}>
      <span>0</span>
      {steps.map((s) => (
        <i key={s} style={{ background: toneFor(s).bg }} />
      ))}
      <span>100</span>
      <span style={{ marginLeft: 12 }}>
        <i style={{ border: "1px dashed var(--line-2)", background: "transparent", verticalAlign: "middle" }} /> sem ponto de controle
      </span>
    </div>
  );
}

/** Heatmap genérico (linhas × colunas) — usado no comparativo da carteira. */
export function MatrixHeatmap({ rows, cols }: { rows: { label: string; values: (number | null)[]; onClick?: () => void }[]; cols: string[] }) {
  return (
    <div className="table-wrap">
      <div className="heat" style={{ gridTemplateColumns: `minmax(180px, 1.6fr) repeat(${cols.length}, minmax(52px, 1fr))`, minWidth: 640 }}>
        <div />
        {cols.map((c) => (
          <div key={c} className="heat-head">
            {c}
          </div>
        ))}
        {rows.map((r) => (
          <Fragment key={r.label}>
            <div className="heat-row-label" style={{ cursor: r.onClick ? "pointer" : undefined }} onClick={r.onClick}>
              {r.label}
            </div>
            {r.values.map((v, i) => {
              const t = toneFor(v);
              return (
                <div key={r.label + i} className="heat-cell" style={{ background: t.bg, color: t.fg }}>
                  {v === null ? "·" : Math.round(v)}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
