import { useCallback, useEffect, useState } from "react";
import { store } from "./store";
import type { TableName, TableRow } from "../model/types";

export function useRows<T extends TableName>(table: T, orgId: string | null | undefined, opts: { all?: boolean } = {}) {
  const [rows, setRows] = useState<TableRow[T][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!orgId && !opts.all) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await store.list(table, opts.all ? undefined : { organization_id: orgId }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [table, orgId, opts.all]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (row: Partial<TableRow[T]> & { id?: string }) => {
      const saved = await store.upsert(table, row);
      setRows((xs) => {
        const i = xs.findIndex((x) => (x as { id: string }).id === (saved as { id: string }).id);
        if (i >= 0) {
          const next = [...xs];
          next[i] = saved;
          return next;
        }
        return [saved, ...xs];
      });
      return saved;
    },
    [table],
  );

  const remove = useCallback(
    async (id: string) => {
      await store.remove(table, id);
      setRows((xs) => xs.filter((x) => (x as { id: string }).id !== id));
    },
    [table],
  );

  return { rows, loading, error, reload, save, remove, setRows };
}
