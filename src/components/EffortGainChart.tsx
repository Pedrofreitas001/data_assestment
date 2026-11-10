// Gráfico de bolhas: cada área na posição (esforço, ganho). Passar o mouse destaca a área,
// clicar leva até ela na lista. Áreas sem estimativa ficam numa faixa abaixo, prontas para estimar.
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { QUADRANTS, brlRange, chartPos, effortLabel, effortWhy, type AreaResult } from "../model/impact";

interface Props {
  /** Áreas na ordem de ataque atual — o número da bolha é a posição nesta lista. */
  ordered: AreaResult[];
  onPick: (key: string) => void;
  onEstimate: (key: string) => void;
}

const short = (title: string) => title.split(" & ")[0];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Afasta bolhas que se sobrepõem, sem sair da área do gráfico. */
function spread(items: { key: string; x: number; y: number }[], bw: number, bh: number, W: number, H: number) {
  const p = items.map((i) => ({ ...i }));
  for (let it = 0; it < 50; it++) {
    let moved = false;
    for (let a = 0; a < p.length; a++)
      for (let b = a + 1; b < p.length; b++) {
        const dx = p[b].x - p[a].x;
        const dy = p[b].y - p[a].y;
        const ox = bw - Math.abs(dx);
        const oy = bh - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (oy <= ox) {
          const s = dy >= 0 ? 1 : -1;
          p[a].y -= (s * oy) / 2;
          p[b].y += (s * oy) / 2;
        } else {
          const s = dx >= 0 ? 1 : -1;
          p[a].x -= (s * ox) / 2;
          p[b].x += (s * ox) / 2;
        }
      }
    for (const q of p) {
      q.x = clamp(q.x, bw / 2 + 4, W - bw / 2 - 4);
      q.y = clamp(q.y, bh / 2 + 4, H - bh / 2 - 4);
    }
    if (!moved) break;
  }
  return p;
}

export default function EffortGainChart({ ordered, onPick, onEstimate }: Props) {
  // O destaque ao passar o mouse vale só dentro do gráfico: não depende da lista abaixo.
  const [hot, onHot] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    setW(el.clientWidth || 720);
    const ro = new ResizeObserver(() => setW(el.clientWidth || 720));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const compact = w < 560;
  const h = compact ? 320 : 380;
  const bw = compact ? 36 : 132;
  const bh = compact ? 36 : 32;

  const est = ordered.filter((r) => r.value > 0);
  const lo = est.length ? Math.min(...est.map((r) => r.value)) : 0;
  const hi = est.length ? Math.max(...est.map((r) => r.value)) : 0;
  const sorted = [...est].map((r) => r.value).sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 0;
  // Quadrantes do mesmo tamanho: os cortes ficam sempre no meio.
  const cutX = 50;
  const cutY = 50;

  const dots = useMemo(() => {
    const raw = est.map((r) => {
      const p = chartPos(r.effort, r.value, lo, hi, median);
      return { key: r.domain.key, x: (p.x / 100) * w, y: (p.y / 100) * h };
    });
    return spread(raw, bw, bh, w, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [est.map((r) => `${r.domain.key}:${r.effort}:${Math.round(r.value)}`).join("|"), w, h]);
  const at = new Map(dots.map((d) => [d.key, d]));

  const focus = hot ? ordered.find((r) => r.domain.key === hot) : null;
  const none = ordered.filter((r) => r.value === 0);

  return (
    <div className="eg">
      <div className="eg-wrap">
        <span className="eg-y">
          <b>Mais ganho</b>
          <b>Menos ganho</b>
        </span>
        <div className="eg-plot" ref={box} style={{ height: h }}>
          {/* quadrantes */}
          <div className="eg-q eg-q-atacar" style={{ left: 0, top: 0, width: `${cutX}%`, height: `${cutY}%` }}>
            <span>Atacar já</span>
          </div>
          <div className="eg-q eg-q-preparar" style={{ left: `${cutX}%`, top: 0, right: 0, height: `${cutY}%` }}>
            <span>Preparar</span>
          </div>
          <div className="eg-q eg-q-rapido" style={{ left: 0, top: `${cutY}%`, width: `${cutX}%`, bottom: 0 }}>
            <span>Ganho rápido</span>
          </div>
          <div className="eg-q eg-q-depois" style={{ left: `${cutX}%`, top: `${cutY}%`, right: 0, bottom: 0 }}>
            <span>Depois</span>
          </div>

          {!est.length && <div className="eg-empty">Estime o ganho de uma área para ela aparecer aqui.</div>}

          {est.map((r) => {
            const p = at.get(r.domain.key);
            if (!p) return null;
            const rank = ordered.indexOf(r) + 1;
            const dim = hot && hot !== r.domain.key;
            return (
              <button
                key={r.domain.key}
                type="button"
                className={`eg-dot eg-${r.quadrant} ${hot === r.domain.key ? "hot" : ""} ${dim ? "dim" : ""} ${compact ? "round" : ""}`}
                style={{ left: p.x, top: p.y }}
                onMouseEnter={() => onHot(r.domain.key)}
                onMouseLeave={() => onHot(null)}
                onFocus={() => onHot(r.domain.key)}
                onBlur={() => onHot(null)}
                onClick={() => onPick(r.domain.key)}
                aria-label={`${rank}º ${r.domain.title}: ganho ${brlRange(r.low, r.high)}, esforço ${effortLabel(r.effort).toLowerCase()}`}
              >
                <i>{rank}</i>
                {!compact && <span>{short(r.domain.title)}</span>}
              </button>
            );
          })}
        </div>
        <span className="eg-x">
          <b>← Menos esforço</b>
          <b>Mais esforço →</b>
        </span>
      </div>

      <div className={`eg-info ${focus ? "on" : ""}`} aria-live="polite">
        {focus ? (
          <>
            <b>
              {ordered.indexOf(focus) + 1}º · {focus.domain.title}
            </b>
            <span className="eg-tag">{QUADRANTS[focus.quadrant].label}</span>
            <span>
              Ganho <b>{focus.value ? brlRange(focus.low, focus.high) : "—"}</b>/ano
            </span>
            <span>
              Esforço <b>{effortLabel(focus.effort)}</b> ({effortWhy(focus)})
            </span>
          </>
        ) : (
          <span className="muted">{compact ? "Toque" : "Passe o mouse"} em uma bolha para ver os detalhes; clique para abrir a área na lista. O número é a ordem de ataque.</span>
        )}
      </div>

      {none.length > 0 && (
        <div className="eg-none">
          <span className="xs muted">Sem estimativa ainda:</span>
          {none.map((r) => (
            <button key={r.domain.key} type="button" className="eg-chip" onClick={() => onEstimate(r.domain.key)}>
              <Plus size={12} /> {short(r.domain.title)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
