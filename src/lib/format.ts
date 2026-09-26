export function fmtDate(iso?: string | null, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", withTime ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short", year: "numeric" });
}

export function relTime(iso?: string | null): string {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `há ${Math.floor(diff / 86400)} d`;
  return fmtDate(iso);
}

export function initials(name?: string | null): string {
  if (!name) return "·";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function pct(n: number | null | undefined): string {
  return n === null || n === undefined || Number.isNaN(n) ? "—" : `${Math.round(n)}`;
}

/** Markdown mínimo e seguro (negrito, itálico, listas, parágrafos) para respostas da IA. */
export function miniMarkdown(src: string): string {
  const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  const blocks = esc.split(/\n{2,}/);
  return blocks
    .map((b) => {
      const lines = b.split("\n");
      if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l)))
        return "<ul>" + lines.map((l) => `<li>${inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""))}</li>`).join("") + "</ul>";
      return `<p>${lines.map(inline).join("<br/>")}</p>`;
    })
    .join("");
}
