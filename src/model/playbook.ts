import { buildRoadmap, type PlanStep } from "./roadmap";
import type { ScoreResult } from "./scoring";
import type { Assessment } from "./types";

export { WAVES } from "./roadmap";

/** Leitura por dimensão, em 3 faixas (usada no relatório e na metodologia). */
export const DIM_PLAYBOOK: Record<string, { critico: string; atencao: string; maduro: string }> = {
  estrategia: {
    critico: "Escolha 3 a 5 indicadores que a diretoria acompanha em reunião fixa antes de investir em ferramenta. Dado sem ritual de uso não gera decisão.",
    atencao: "Os indicadores existem — ligue cada um a uma meta e a um gatilho de ação ('se X passar de Y, fazemos Z') e meça o resultado das decisões.",
    maduro: "Use o histórico no planejamento, com cenários, e mantenha um plano de dados com orçamento revisado pela diretoria.",
  },
  fontes: {
    critico: "Faça o inventário das fontes e declare a fonte oficial de cada informação importante. Isso sozinho reduz boa parte da desconfiança.",
    atencao: "Centralize os dados numa base única, resolva o acesso direto aos sistemas críticos e confirme o backup.",
    maduro: "Automatize as cargas com aviso de falha, publique a data de atualização e teste a recuperação periodicamente.",
  },
  qualidade: {
    critico: "Comece com 3 conferências simples — registros faltando, valores fora do padrão, divergência entre dois sistemas — cada uma com um responsável.",
    atencao: "Corrija os erros na origem, registre as causas e transforme as conferências em alertas com prazo de correção.",
    maduro: "Meça e publique a qualidade dos indicadores críticos, com meta, e previna os erros recorrentes na entrada.",
  },
  integracao: {
    critico: "Crie a tabela de correspondência de códigos (cliente, item, fornecedor) entre os sistemas. Sem ela, todo cruzamento entre áreas é frágil.",
    atencao: "Troque o copiar-e-colar por consolidação automática usando a tabela como chave, e documente a origem dos indicadores principais.",
    maduro: "Evolua para cadastro mestre único, com regra de criação e validação.",
  },
  governanca: {
    critico: "Nomeie um responsável de negócio por área de dados, mesmo que informal no início. Sem responsável, nenhuma regra ganha legitimidade.",
    atencao: "Escreva as definições dos indicadores principais (Glossário) e combine que a definição escrita resolve as divergências.",
    maduro: "Instale uma rotina curta de governança (mensal, 30 min) para decidir mudanças de regra e prioridades.",
  },
  seguranca: {
    critico: "Faça o inventário de acessos (sem senhas) e mapeie onde estão os dados pessoais. Nada de senha em planilha ou e-mail.",
    atencao: "Classifique os dados por sensibilidade, ajuste os acessos e defina a base legal de cada uso de dado pessoal.",
    maduro: "Cofre de senhas, revisão trimestral de acessos e processo de LGPD completo (encarregado, retenção, titulares).",
  },
  pessoas: {
    critico: "Reduza a dependência de pessoa-chave: documente as 3 rotinas mais críticas e defina quem produz as análises.",
    atencao: "Capacite o time na ferramenta que já existe e ensine os gestores a ler os indicadores da própria área.",
    maduro: "Forme multiplicadores nas áreas e crie rituais em que cada área apresenta os próprios números.",
  },
  ia: {
    critico: "Antes de IA, publique regras de uso e automatize a rotina manual que mais consome horas.",
    atencao: "Escolha um caso de IA ligado a uma dor real, prepare os dados e meça contra a situação atual.",
    maduro: "Aprove e acompanhe os casos de IA sobre dados governados, com automações monitoradas.",
  },
};

export type ActionItem = PlanStep;

/** Plano de ação priorizado (atalho para o motor de próximos passos). */
export function buildActionPlan(a: Pick<Assessment, "answers" | "context">, score: ScoreResult): ActionItem[] {
  return buildRoadmap(a, score).steps;
}
