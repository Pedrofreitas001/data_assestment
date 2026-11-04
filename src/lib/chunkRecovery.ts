// Recuperação de "nova versão publicada".
// Depois de cada deploy os arquivos de código mudam de nome. Uma aba aberta (ou uma página em cache)
// da versão anterior pede um arquivo que não existe mais e o navegador mostra
// "Importing a module script failed" / "Failed to fetch dynamically imported module".
// Aqui detectamos esse caso e recarregamos UMA vez para pegar a versão nova.
import { lazy, type ComponentType } from "react";

const CHUNK_ERROR = /importing a module script failed|failed to fetch dynamically imported module|error loading dynamically imported module|unable to preload css|chunkloaderror|loading (css )?chunk .* failed|expected a javascript.* module script/i;

export function isChunkError(e: unknown): boolean {
  const msg = typeof e === "string" ? e : (e as { message?: string } | null)?.message ?? "";
  return CHUNK_ERROR.test(String(msg));
}

const KEY = "moulis:chunk-reload";

/** Recarrega a página para buscar a versão nova. Só tenta uma vez a cada 60 s (evita laço de recarregamento). */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false; // sem armazenamento não há como garantir que não vira laço
  }
  location.reload();
  return true;
}

/** React.lazy que se recupera de arquivo de versão antiga. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (e) {
      if (isChunkError(e) && reloadForNewVersion()) return new Promise<never>(() => {}); // a página vai recarregar
      throw e;
    }
  });
}

/** Ouvintes globais: erro de pré-carga do Vite e promessas rejeitadas por arquivo ausente. */
export function installChunkRecovery() {
  // Só "engole" o erro quando vai recarregar; senão o Vite lança o erro real (mostrado como "nova versão").
  window.addEventListener("vite:preloadError", (ev) => {
    if (reloadForNewVersion()) ev.preventDefault();
  });
  window.addEventListener("unhandledrejection", (ev) => {
    if (isChunkError(ev.reason) && reloadForNewVersion()) ev.stopImmediatePropagation();
  });
}
