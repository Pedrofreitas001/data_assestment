// Reordenar uma lista vertical arrastando — funciona com mouse e dedo (pointer events).
// Durante o arraste, os cartões são movidos direto no DOM (sem redesenhar a página a cada
// movimento); ao soltar, a nova ordem vai para o React e cada cartão desliza até a nova
// posição (técnica FLIP). As setas usam a mesma animação via snapshot().
import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const EASE = "cubic-bezier(.2,.8,.2,1)";

export function useSortable(keys: string[], onReorder: (next: string[]) => void) {
  const els = useRef(new Map<string, HTMLElement>());
  const refs = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const snap = useRef<Map<string, number> | null>(null);
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const cbRef = useRef(onReorder);
  cbRef.current = onReorder;
  const [tick, setTick] = useState(0);
  const sig = keys.join("|");

  /** Ref estável por item (não muda a cada render). */
  const register = useCallback((key: string) => {
    let fn = refs.current.get(key);
    if (!fn) {
      fn = (el: HTMLElement | null) => {
        if (el) els.current.set(key, el);
        else els.current.delete(key);
      };
      refs.current.set(key, fn);
    }
    return fn;
  }, []);

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
    (key: string, e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const list = keysRef.current;
      const from = list.indexOf(key);
      if (from < 0) return;
      e.preventDefault();

      const sy = window.scrollY;
      const items = list.map((k) => els.current.get(k)!);
      const rects = items.map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top + sy, h: r.height };
      });
      const gap = rects.length > 1 ? Math.max(0, rects[1].top - (rects[0].top + rects[0].h)) : 12;
      const shift = rects[from].h + gap;

      const pointerId = e.pointerId;
      const startY = e.clientY;
      let lastY = startY;
      let over = from;
      let dirty = true;
      let raf = 0;
      try {
        e.currentTarget.setPointerCapture(pointerId);
      } catch {
        /* sem captura: os eventos seguem pela janela */
      }
      document.body.style.userSelect = "none";
      items.forEach((el, i) => {
        if (i === from) {
          Object.assign(el.style, { position: "relative", zIndex: "5", transition: "none", boxShadow: "0 14px 32px rgba(0,0,0,.18)", cursor: "grabbing" });
          el.classList.add("dragging");
        } else el.style.transition = `transform 190ms ${EASE}`;
      });

      const apply = () => {
        const dy = lastY - startY + (window.scrollY - sy);
        const center = rects[from].top + rects[from].h / 2 + dy;
        let o = from;
        for (let j = from + 1; j < rects.length; j++) if (center > rects[j].top + rects[j].h / 2) o = j;
        for (let j = from - 1; j >= 0; j--) if (center < rects[j].top + rects[j].h / 2) o = j;
        over = o;
        items.forEach((el, i) => {
          if (i === from) el.style.transform = `translateY(${dy}px) scale(1.012)`;
          else el.style.transform = from < i && i <= o ? `translateY(${-shift}px)` : o <= i && i < from ? `translateY(${shift}px)` : "";
        });
      };

      // Um único quadro por vez: rolagem automática perto da borda + posição dos cartões.
      const frame = () => {
        const before = window.scrollY;
        if (lastY < 80) window.scrollBy(0, -16);
        else if (lastY > window.innerHeight - 80) window.scrollBy(0, 16);
        if (dirty || window.scrollY !== before) {
          dirty = false;
          apply();
        }
        raf = requestAnimationFrame(frame);
      };

      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        lastY = ev.clientY;
        dirty = true;
      };
      const finish = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        document.body.style.userSelect = "";
        apply();
        snapshot(); // posição visual no momento de soltar
        items.forEach((el) => Object.assign(el.style, { transition: "none", transform: "", position: "", zIndex: "", boxShadow: "", cursor: "" }));
        items.forEach((el) => {
          el.style.transition = "";
          el.classList.remove("dragging");
        });
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
      raf = requestAnimationFrame(frame);
    },
    [snapshot],
  );

  return { register, start, snapshot };
}
