import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { BANDS, colorFor, type Band } from "../model/framework";

export function PageHead({ eyebrow, title, desc, actions }: { eyebrow?: ReactNode; title: ReactNode; desc?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {desc && <p className="page-desc">{desc}</p>}
      </div>
      {actions && <div className="head-actions no-print">{actions}</div>}
    </header>
  );
}

export function Field({ label, hint, children, full, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; full?: boolean; htmlFor?: string }) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Spinner() {
  return <span className="spin" aria-label="Carregando" />;
}

export function LoadingPage() {
  return (
    <div className="loading-page">
      <Spinner />
    </div>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

function useEsc(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
}

export function Drawer({ title, eyebrow, onClose, children, footer, wide }: { title: ReactNode; eyebrow?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEsc(onClose);
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className={`drawer ${wide ? "wide" : ""}`} role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div className="grow">
            {eyebrow && <p className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</p>}
            <h2 className="drawer-title">{title}</h2>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>
  );
}

export function Modal({ title, eyebrow, onClose, children, footer }: { title: ReactNode; eyebrow?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEsc(onClose);
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div className="grow">
            {eyebrow && <p className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</p>}
            <h2 className="drawer-title">{title}</h2>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: ReactNode; count?: number }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} className={`tab ${value === t.key ? "on" : ""}`} onClick={() => onChange(t.key)}>
          {t.label}
          {t.count !== undefined && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Barra de progresso. Por padrão a cor segue a faixa de maturidade do valor; `brand` usa a cor da marca. */
export function Bar({ value, thin, brand }: { value: number | null | undefined; thin?: boolean; brand?: boolean }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className={`bar ${thin ? "thin" : ""}`}>
      <span style={{ width: `${v}%`, background: brand ? "var(--brand)" : colorFor(value) }} />
    </div>
  );
}

export function BandScale({ band, computed }: { band: Band | null; computed?: Band | null }) {
  return (
    <div>
      <div className="band-scale">
        {BANDS.map((b) => {
          const on = band && b.level <= band.level;
          const cap = !on && computed && band && b.level <= computed.level && b.level > band.level;
          return <div key={b.level} className={`seg ${on ? "on" : ""} ${cap ? "cap" : ""}`} style={on ? { background: b.color } : undefined} title={`${b.level} · ${b.label}`} />;
        })}
      </div>
      <div className="band-labels">
        {BANDS.map((b) => (
          <span key={b.level} className={band?.level === b.level ? "on" : ""}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LevelPill({ level, label, light }: { level: number | null | undefined; label?: string; light?: boolean }) {
  if (!level) return <span className="badge badge-dashed">Sem nível</span>;
  const b = BANDS[level - 1];
  return (
    <span className="level-pill" style={light ? { background: b.soft, color: "var(--ink)" } : { background: b.color, color: b.fg }}>
      <span className="lv" style={light ? { background: b.color, color: b.fg } : { color: b.color }}>
        {level}
      </span>
      {label ?? b.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    rascunho: { label: "Rascunho", cls: "badge-dashed" },
    em_revisao: { label: "Em revisão", cls: "badge-brand" },
    concluido: { label: "Concluído", cls: "badge-ok" },
    em_validacao: { label: "Em validação", cls: "badge-brand" },
    validado: { label: "Validado", cls: "badge-ok" },
    descontinuado: { label: "Descontinuado", cls: "badge-dashed" },
    ativo: { label: "Ativo", cls: "badge-ok" },
    pausado: { label: "Pausado", cls: "badge-dashed" },
    encerrado: { label: "Encerrado", cls: "badge-dashed" },
  };
  const m = map[status] || { label: status, cls: "" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

export function Stat({ label, value, unit, foot, icon }: { label: ReactNode; value: ReactNode; unit?: ReactNode; foot?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card stat">
      <div className="stat-label">
        {icon}
        {label}
      </div>
      <div className="stat-value num">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

export function AiMark({ size = 14 }: { size?: number }) {
  return (
    <span className="ai-mark" aria-hidden>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      </svg>
    </span>
  );
}

export function MoulisMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M7 24V8l9 10 9-10v16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Faixa única de métricas (substitui vários cards soltos). */
export function Metrics({ items }: { items: { label: ReactNode; value: ReactNode; hint?: ReactNode }[] }) {
  return (
    <div className="card metrics">
      {items.map((m, i) => (
        <div key={i} className="metric">
          <div className="metric-value num">{m.value}</div>
          <div className="metric-label">{m.label}</div>
          {m.hint && <div className="metric-hint">{m.hint}</div>}
        </div>
      ))}
    </div>
  );
}
