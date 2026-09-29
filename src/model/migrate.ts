// Migra respostas de diagnósticos feitos na versão 2 do questionário
// (escalas de 3 e 5 níveis, perguntas retiradas) para a versão 3.
// Aplicada na leitura (lib/store) — idempotente pelo campo context.versao.
import { FRAMEWORK_VERSION } from "./framework";
import type { Assessment } from "./types";

/** Valor antigo → valor novo, para perguntas cuja escala mudou. */
const SCALE_MAP: Record<string, Record<number, number>> = {
  est_uso: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 4 },
  fnt_arquitetura: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 4 },
  qual_confianca: { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4 },
  int_consol: { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4 },
  pes_skill: { 1: 2, 2: 3, 3: 3, 4: 4, 5: 4 },
  ia_dados: { 1: 2, 2: 3, 3: 4 },
};

/** Perguntas que saíram do questionário (o conteúdo foi absorvido por outras). */
const REMOVED = ["est_producao", "qual_premissas", "gov_processo", "ia_uso"];

export function upgradeAssessment<T extends Pick<Assessment, "answers" | "context">>(a: T): T {
  if (!a || (a.context?.versao ?? 0) >= FRAMEWORK_VERSION) return a;
  const answers: Record<string, number> = { ...(a.answers || {}) };
  for (const [id, map] of Object.entries(SCALE_MAP)) {
    const v = answers[id];
    if (typeof v === "number" && v > 0 && map[v] !== undefined) answers[id] = map[v];
  }
  // A documentação de processos migra para "dependência de pessoas" quando ela não foi respondida.
  if (answers.gov_processo >= 3 && answers.pes_dependencia === undefined) answers.pes_dependencia = 3;
  for (const id of REMOVED) delete answers[id];
  return { ...a, answers, context: { ...(a.context || {}), versao: FRAMEWORK_VERSION } };
}
