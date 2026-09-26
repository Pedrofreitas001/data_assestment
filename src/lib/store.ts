import { supabase } from "./supabase";
import type { TableName, TableRow } from "../model/types";
import { demoSeed } from "./demoSeed";

type Row<T extends TableName> = TableRow[T];
type Filter = { organization_id?: string | null };

export interface Store {
  list<T extends TableName>(table: T, filter?: Filter): Promise<Row<T>[]>;
  get<T extends TableName>(table: T, id: string): Promise<Row<T> | null>;
  upsert<T extends TableName>(table: T, row: Partial<Row<T>> & { id?: string }): Promise<Row<T>>;
  remove(table: TableName, id: string): Promise<void>;
}

export function uid(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------
// Supabase (produção) — RLS no banco garante o isolamento por cliente.
// ---------------------------------------------------------------------
const remoteStore: Store = {
  async list(table, filter) {
    let q = supabase!.from(table).select("*");
    if (filter?.organization_id) q = q.eq("organization_id", filter.organization_id);
    const { data, error } = await q.order("updated_at", { ascending: false });
    if (error) throw error;
    return data as never;
  },
  async get(table, id) {
    const { data, error } = await supabase!.from(table).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as never;
  },
  async upsert(table, row) {
    const payload = { ...row, id: row.id || uid() } as Record<string, unknown>;
    delete payload.created_at;
    delete payload.updated_at;
    const { data, error } = await supabase!.from(table).upsert(payload).select("*").single();
    if (error) throw error;
    return data as never;
  },
  async remove(table, id) {
    const { error } = await supabase!.from(table).delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------
// Demonstração (localStorage) — mesmo contrato, para rodar sem backend.
// ---------------------------------------------------------------------
const KEY = (t: TableName) => `moulis:v1:${t}`;

function read<T>(t: TableName): T[] {
  try {
    const raw = localStorage.getItem(KEY(t));
    if (raw) return JSON.parse(raw);
  } catch {
    /* storage indisponível */
  }
  return [];
}
function write(t: TableName, rows: unknown[]) {
  try {
    localStorage.setItem(KEY(t), JSON.stringify(rows));
  } catch {
    /* storage indisponível */
  }
}

function ensureSeed() {
  try {
    if (localStorage.getItem("moulis:v1:seeded")) return;
    const seed = demoSeed();
    (Object.keys(seed) as TableName[]).forEach((t) => write(t, seed[t] as unknown[]));
    localStorage.setItem("moulis:v1:seeded", "1");
  } catch {
    /* ignore */
  }
}

export function resetDemo() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("moulis:v1:"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 60));

const localStore: Store = {
  async list(table, filter) {
    ensureSeed();
    let rows = read<Row<typeof table>>(table);
    if (filter?.organization_id) rows = rows.filter((r) => (r as { organization_id?: string }).organization_id === filter.organization_id);
    rows.sort((a, b) => String((b as { updated_at?: string }).updated_at || "").localeCompare(String((a as { updated_at?: string }).updated_at || "")));
    return delay(rows as never);
  },
  async get(table, id) {
    ensureSeed();
    return delay((read<{ id: string }>(table).find((r) => r.id === id) as never) ?? null);
  },
  async upsert(table, row) {
    ensureSeed();
    const rows = read<Record<string, unknown>>(table);
    const now = new Date().toISOString();
    const id = row.id || uid();
    const i = rows.findIndex((r) => r.id === id);
    const next = { ...(i >= 0 ? rows[i] : { created_at: now }), ...row, id, updated_at: now };
    if (i >= 0) rows[i] = next;
    else rows.unshift(next);
    write(table, rows);
    return delay(next as never);
  },
  async remove(table, id) {
    write(table, read<{ id: string }>(table).filter((r) => r.id !== id));
    await delay(null);
  },
};

export const store: Store = supabase ? remoteStore : localStore;
