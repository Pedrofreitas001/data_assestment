// Radar de 4 eixos (losango): mostra o "formato" de um perfil de relance.
import { STEWARD_DIMENSIONS, type StewardResult } from "../model/steward";

export default function Radar({ dims, size = 120, labels = false }: { dims: StewardResult["dims"]; size?: number; labels?: boolean }) {
  // Com rótulos, sobra espaço dos lados para textos como "Trânsito 100".
  const padX = labels ? 66 : 8;
  const padY = labels ? 30 : 8;
  const W = size + padX * 2;
  const H = size + padY * 2;
  const cx = W / 2;
  const cy = H / 2;
  const R = size / 2;
  // topo, direita, base, esquerda
  const pt = (i: number, v: number) => {
    const a = (-90 + i * 90) * (Math.PI / 180);
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v] as const;
  };
  const ring = (v: number) => STEWARD_DIMENSIONS.map((_, i) => pt(i, v).join(",")).join(" ");
  const poly = STEWARD_DIMENSIONS.map((d, i) => pt(i, (dims[d.key] ?? 0) / 100).join(",")).join(" ");
  const label = [
    { x: cx, y: padY - 10, anchor: "middle" as const },
    { x: cx + R + 8, y: cy + 4, anchor: "start" as const },
    { x: cx, y: cy + R + 20, anchor: "middle" as const },
    { x: cx - R - 8, y: cy + 4, anchor: "end" as const },
  ];
  return (
    <svg className="radar" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Perfil: ${STEWARD_DIMENSIONS.map((d) => `${d.short} ${dims[d.key] === null ? "sem resposta" : Math.round(dims[d.key]!)}`).join(", ")}`}>
      {[0.25, 0.5, 0.75, 1].map((v) => (
        <polygon key={v} points={ring(v)} fill={v === 0.5 ? "var(--surface-2)" : "none"} stroke="var(--line-2)" strokeWidth={v === 1 ? 1.2 : 0.8} strokeDasharray={v === 1 ? undefined : "2 3"} />
      ))}
      {STEWARD_DIMENSIONS.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line-2)" strokeWidth={0.8} />;
      })}
      <polygon points={poly} fill="var(--ink)" fillOpacity={0.14} stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" style={{ transition: "all .35s cubic-bezier(.2,.8,.2,1)" }} />
      {STEWARD_DIMENSIONS.map((d, i) => {
        const [x, y] = pt(i, (dims[d.key] ?? 0) / 100);
        return <circle key={d.key} cx={x} cy={y} r={3.5} fill="var(--ink)" />;
      })}
      {labels &&
        STEWARD_DIMENSIONS.map((d, i) => (
          <text key={d.key} x={label[i].x} y={label[i].y} textAnchor={label[i].anchor} fontSize="11" fontWeight="600" fill="var(--ink-2)">
            {d.short} {dims[d.key] === null ? "—" : Math.round(dims[d.key]!)}
          </text>
        ))}
    </svg>
  );
}
