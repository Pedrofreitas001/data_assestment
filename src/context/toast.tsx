import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { friendlyError } from "../lib/errors";
import { Check, AlertTriangle } from "lucide-react";

type Toast = { id: number; msg: string; kind: "ok" | "err" };
const Ctx = createContext<(msg: string, kind?: "ok" | "err") => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, msg, kind }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), kind === "err" ? 6000 : 3200);
  }, []);
  useEffect(() => {
    const onReject = (ev: PromiseRejectionEvent) => {
      ev.preventDefault();
      console.error("Erro não tratado:", ev.reason);
      push(friendlyError(ev.reason), "err");
    };
    window.addEventListener("unhandledrejection", onReject);
    return () => window.removeEventListener("unhandledrejection", onReject);
  }, [push]);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind === "err" ? "err" : ""}`}>
            {t.kind === "err" ? <AlertTriangle size={15} /> : <Check size={15} />}
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
