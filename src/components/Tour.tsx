// Tour guiado: escurece a tela, destaca a seção explicada e mostra um texto breve.
// Abre pelo botão azul no assistente (startTour). Sai pelo X, pela tecla Esc ou ao concluir.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { stepsFor, type TourStep } from "../lib/tourSteps";

const EVENT = "moulis:tour";

export function startTour() {
  window.dispatchEvent(new Event(EVENT));
}

function visible(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return false;
  if (r.right <= 0 || r.left >= window.innerWidth) return false; // menu recolhido fora da tela
  const cs = getComputedStyle(el);
  return cs.visibility !== "hidden" && cs.display !== "none";
}

function resolve(step: TourStep): HTMLElement | null {
  const a = document.querySelector(step.sel);
  if (visible(a)) return a;
  const b = step.alt ? document.querySelector(step.alt) : null;
  return visible(b) ? b : null;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function Tour() {
  const loc = useLocation();
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(180);

  const close = useCallback(() => {
    setSteps(null);
    setBox(null);
  }, []);

  // Início: só entram os passos cujo elemento está na tela.
  useEffect(() => {
    const go = () => {
      const list = stepsFor(loc.pathname).filter((s) => resolve(s));
      if (!list.length) return;
      setI(0);
      setSteps(list);
    };
    window.addEventListener(EVENT, go);
    return () => window.removeEventListener(EVENT, go);
  }, [loc.pathname]);

  // Mudou de tela: encerra.
  useEffect(() => {
    close();
  }, [loc.pathname, close]);

  const step = steps?.[i];

  // Rola até a seção e acompanha sua posição (rolagem, redimensionamento, animações).
  useEffect(() => {
    if (!step) return;
    const el = resolve(step);
    if (!el) return;
    const r0 = el.getBoundingClientRect();
    const tall = r0.height > window.innerHeight * 0.6;
    el.scrollIntoView({ behavior: "smooth", block: tall ? "start" : "center" });
    let raf = 0;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const pad = 8;
      const top = Math.max(8, r.top - pad);
      const bottom = Math.min(window.innerHeight - 8, r.bottom + pad);
      setBox((b) => {
        const nb = { top, left: Math.max(8, r.left - pad), width: Math.min(window.innerWidth - 16, r.width + pad * 2), height: Math.max(24, bottom - top) };
        return b && Math.abs(b.top - nb.top) < 0.5 && Math.abs(b.left - nb.left) < 0.5 && Math.abs(b.height - nb.height) < 0.5 && Math.abs(b.width - nb.width) < 0.5 ? b : nb;
      });
      raf = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(raf);
  }, [step]);

  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight);
  }, [step, box?.width]);

  useEffect(() => {
    if (!steps) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") setI((x) => Math.min(steps.length - 1, x + 1));
      else if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps, close]);

  if (!steps || !step) return null;
  const last = i === steps.length - 1;

  // Cartão abaixo da seção; se não couber, acima; se a seção ocupa a tela, no rodapé.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(360, vw - 24);
  let cardStyle: CSSProperties = { width: w, left: Math.max(12, vw - w - 16), bottom: 16 };
  if (box) {
    const below = box.top + box.height + 12;
    const above = box.top - 12 - cardH;
    const left = Math.max(12, Math.min(vw - w - 12, box.left + box.width / 2 - w / 2));
    if (below + cardH <= vh - 8) cardStyle = { width: w, left, top: below };
    else if (above >= 8) cardStyle = { width: w, left, top: above };
    else cardStyle = { width: w, left: Math.max(12, vw - w - 16), bottom: 16 };
  }

  return createPortal(
    <div className="tour" role="dialog" aria-modal="true" aria-label="Tour guiado">
      <div className="tour-catch" onClick={(e) => e.stopPropagation()} />
      {box && <div className="tour-spot" style={{ top: box.top, left: box.left, width: box.width, height: box.height }} />}
      <div className="tour-card" ref={card} style={cardStyle}>
        <div className="tour-top">
          <span className="tour-count">
            Passo {i + 1} de {steps.length}
          </span>
          <button className="tour-x" onClick={close} aria-label="Sair do tour" title="Sair do tour (Esc)">
            <X size={16} />
          </button>
        </div>
        <h4 className="tour-title">{step.title}</h4>
        <p className="tour-text">{step.text}</p>
        <div className="tour-foot">
          <span className="tour-dots" aria-hidden>
            {steps.map((_, k) => (
              <i key={k} className={k === i ? "on" : k < i ? "done" : ""} />
            ))}
          </span>
          <button className="tour-btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
            <ArrowLeft size={14} /> Voltar
          </button>
          <button className="tour-btn" onClick={() => (last ? close() : setI(i + 1))} autoFocus>
            {last ? "Concluir" : "Próximo"} {!last && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
