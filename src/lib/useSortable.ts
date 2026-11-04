// Reordenar uma lista vertical arrastando — funciona com mouse e dedo (pointer events).
// O cartão acompanha o ponteiro, os demais abrem espaço com animação e, ao soltar (ou ao
// usar as setas), cada cartão desliza até a nova posição (técnica FLIP).
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

interface DragState {
  key: string;
  from: number;
  over: number;
  dy: number;
}

interface Geo {
  rects: { top: number; h: number }[];
  gap: number;
}

const EASE = "cubic-bezier(.2,.8,.2,1)";

export function useSortable(keys: string[], onReorder: (next: string[]) => void) {
  const els = useRef(new Map<string, HTMLElement>());
  const snap = useRef<Map<string, number> | null>(null);
  const geo = useRef<Geo>({ rects: [], gap: 12 });
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const cbRef = useRef(onReorder);
  cbRef.current = onReorder;
  const [drag, setDrag] = useState<DragState | null>(null);
  const [tick, setTick] = useState(0);
  const sig = keys.join("|");

  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) els.current.set(key, el);
      else els.current.delete(key);
    },
    [],
  );

  /** Guarda a posição atual de cada item; a próxima troca de ordem anima a partir daqui. */
  const snapshot = useCallback(() => {
    const m = new Map<string, number>();
    els.current.forEach((el, k) => m.set(k, el.getBoundingClientRect().top));
    snap.current = m;
  }, []);

  useLayoutEffect(() => {
    const prev = snap.current;
    if (!prev) return;
    snap.current = null;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    els.current.forEach((el, k) => {
      const before = prev.get(k);
      if (before === undefined) return;
      const dy = before - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], { duration: 260, easing: EASE });
    });
  }, [sig, tick]);

  const start = useCallback(
    (key: string) => (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const list = keysRef.current;
      const from = list.indexOf(key);
      if (from < 0) return;
      e.preventDefault();

      const sy = window.scrollY;
      const rects = list.map((k) => {
        const r = els.current.get(k)!.getBoundingClientRect();
        return { top: r.top + sy, h: r.height };
      });
      const gap = rects.length > 1 ? Math.max(0, rects[1].top - (rects[0].top + rects[0].h)) : 12;
      geo.current = { rects, gap };

      const startY = e.clientY;
      const pointerId = e.pointerId;
      let lastY = startY;
      let over = from;
      let raf = 0;
      try {
        e.currentTarget.setPointerCapture(pointerId);
      } catch {
        /* sem captura: os eventos seguem pela janela */
      }
      document.body.style.userSelect = "none";

      const update = () => {
        const dy = lastY - startY + (window.scrollY - sy);
        const center = rects[from].top + rects[from].h / 2 + dy;
        let o = from;
        for (let j = from + 1; j < rects.length; j++) if (center > rects[j].top + rects[j].h / 2) o = j;
        for (let j = from - 1; j >= 0; j--) if (center < rects[j].top + rects[j].h / 2) o = j;
        over = o;
        setDrag({ key, from, over: o, dy });
      };

      // Rolagem automática quando o dedo chega perto da borda da tela.
      const autoScroll = () => {
        const before = window.scrollY;
        if (lastY < 80) window.scrollBy(0, -16);
        else if (lastY > window.innerHeight - 80) window.scrollBy(0, 16);
        if (window.scrollY !== before) update();
        raf = requestAnimationFrame(autoScroll);
      };

      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        lastY = ev.clientY;
        update();
      };
      const finish = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        document.body.style.userSelect = "";
        snapshot();
        setDrag(null);
        setTick((t) => t + 1);
        if (over !== from) {
          const next = list.filter((k) => k !== key);
          next.splice(over, 0, key);
          cbRef.current(next);
        }
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
      raf = requestAnimationFrame(autoScroll);
      update();
    },
    [snapshot],
  );

  const styleFor = (key: string): CSSProperties | undefined => {
    if (!drag) return undefined;
    const idx = keys.indexOf(key);
    if (key === drag.key)
      return { position: "relative", zIndex: 5, transform: `translateY(${drag.dy}px) scale(1.012)`, transition: "none", boxShadow: "0 14px 32px rgba(0,0,0,.18)", cursor: "grabbing" };
    const h = geo.current.rects[drag.from].h + geo.current.gap;
    let t = 0;
    if (drag.from < idx && idx <= drag.over) t = -h;
    else if (drag.over <= idx && idx < drag.from) t = h;
    return { transform: `translateY(${t}px)`, transition: `transform 190ms ${EASE}` };
  };

  return { register, start, styleFor, snapshot, dragKey: drag?.key ?? null };
}
