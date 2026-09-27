// Vercel Function — POST /api/log  { message, stack, componentStack, path }
// Recebe erros de renderização do navegador e grava nos Runtime Logs da Vercel
// (prefixo [client-error]) para diagnóstico. Não armazena nada.
export async function POST(request: Request) {
  try {
    const raw = (await request.text()).slice(0, 8000);
    const b = JSON.parse(raw) as { message?: string; stack?: string; componentStack?: string; path?: string; where?: string };
    const clean = (s?: string, n = 1500) => String(s || "").replace(/eyJ[\w-]+\.[\w-]+\.[\w-]*/g, "[jwt]").slice(0, n);
    console.error(
      `[client-error] ${clean(b.where, 40)} ${clean(b.path, 120)} :: ${clean(b.message, 400)}\n` +
        `stack: ${clean(b.stack)}\ncomponent: ${clean(b.componentStack)}`,
    );
  } catch {
    /* corpo inválido: ignora */
  }
  return new Response(null, { status: 204 });
}
