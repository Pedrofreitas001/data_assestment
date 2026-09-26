import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Em desenvolvimento, serve /api/llm com o mesmo núcleo usado na Vercel. */
function devApi(): Plugin {
  return {
    name: "moulis-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/llm", async (req, res) => {
        const { handleLlmRequest } = await server.ssrLoadModule("/llm/core.ts");
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
        const request = new Request(`http://localhost${req.url || ""}`, {
          method: req.method,
          headers,
          body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
        });
        const response: Response = await handleLlmRequest(request);
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(await response.text());
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v;
  return {
    plugins: [react(), devApi()],
    build: { chunkSizeWarningLimit: 900 },
  };
});
