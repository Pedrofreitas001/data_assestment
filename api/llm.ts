// Vercel Function — POST /api/llm  { skill, input, messages? }
// A chave do OpenRouter fica só no servidor; o front nunca a vê.
import { handleLlmRequest } from "../llm/core.js";

export async function POST(request: Request) {
  return handleLlmRequest(request);
}

export async function GET(request: Request) {
  return handleLlmRequest(request);
}
