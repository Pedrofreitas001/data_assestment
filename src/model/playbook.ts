import { DIMENSIONS, UNKNOWN } from "./framework";
import { checkScore, questionScore, scopedDomains, type ScoreResult } from "./scoring";
import type { Assessment } from "./types";

/** Leitura por dimensão, em 3 faixas (usada no relatório e no manual). */
export const DIM_PLAYBOOK: Record<string, { critico: string; atencao: string; maduro: string }> = {
  estrategia: {
    critico: "Defina 3 a 5 KPIs que a diretoria acompanha em rotina fixa antes de investir em ferramenta. Dado sem ritual de uso não gera decisão.",
    atencao: "Os KPIs existem — leve-os para decisões táticas (reposição, preço, rota) com gatilhos claros: 'se X passar de Y, fazemos Z'.",
    maduro: "Evolua para cenários e forecast; conecte o roadmap de dados às metas do planejamento anual.",
  },
  fontes: {
    critico: "Inventarie as fontes de dados e declare a fonte oficial de cada informação crítica. Isso sozinho reduz boa parte da desconfiança.",
    atencao: "Consolide em um banco único (camada prata) com carga agendada; resolva o acesso por API das fontes críticas.",
    maduro: "Estruture camadas bronze/prata/ouro com monitoramento de carga e SLA de atualização publicado.",
  },
  qualidade: {
    critico: "Comece com 3 checagens diárias simples: dias sem venda por SKU, variação atípica dia a dia e divergência ERP × e-commerce — cada uma com um steward.",
    atencao: "Transforme as checagens em alertas automáticos com prazo de correção e publique um índice de qualidade por domínio.",
    maduro: "Defina metas de qualidade por KPI crítico e inclua o índice nos rituais de gestão.",
  },
  integracao: {
    critico: "Construa a tabela mestra de-para (DIM) de SKU entre ERP, e-commerce, WMS e planilhas. É entregável formal do diagnóstico, não pré-requisito implícito.",
    atencao: "Troque o copiar-e-colar por pipeline (Python/Power Query → banco) usando a DIM como chave; documente a linhagem dos KPIs críticos.",
    maduro: "Evolua para cadastro mestre com workflow de criação/alteração e validação automática.",
  },
  governanca: {
    critico: "Nomeie um Data Owner por domínio crítico (mesmo informal no início). Sem owner, nenhuma premissa ganha legitimidade.",
    atencao: "Adicione stewards/backup, documente os processos críticos e publique o glossário de KPIs.",
    maduro: "Instale um comitê leve (mensal, 30 min) para priorizar demandas e aprovar mudanças de definição.",
  },
  seguranca: {
    critico: "Faça o inventário de credenciais (quem tem, onde está, quando expira) e mapeie onde há dados pessoais. Nada de senha em planilha ou e-mail.",
    atencao: "Classifique os dados por sensibilidade e ajuste acessos: nem todo usuário precisa do dado bruto.",
    maduro: "Implante cofre de senhas com rotação, revisão trimestral de acessos e processo de resposta a titulares (LGPD).",
  },
  pessoas: {
    critico: "Reduza a dependência de pessoa-chave: documente as 3 rotinas mais críticas e treine um backup.",
    atencao: "Capacitação prática (SQL/BI) com tempo protegido e um entregável rápido que mostre valor ao time.",
    maduro: "Crie multiplicadores internos e rituais em que as áreas apresentam seus próprios números.",
  },
  ia: {
    critico: "Antes de IA, automatize a rotina manual mais repetitiva — ganho rápido que libera horas do time.",
    atencao: "Escolha um caso de IA com dado já governado (ex.: previsão de demanda de curva A) e meça contra o baseline.",
    maduro: "Camada de linguagem natural sobre a camada ouro, com dicionário de perguntas pré-definido (padrão routing).",
  },
};

/** Ação recomendada quando uma pergunta de capacidade pontua baixo. */
export const QUESTION_ACTIONS: Record<string, string> = {
  est_uso: "Instituir ritual semanal de KPIs com gatilhos de decisão definidos.",
  est_producao: "Migrar o relatório mais repetitivo de planilha manual para BI com atualização agendada.",
  est_prioridade: "Vincular 2 iniciativas de dados a metas de negócio com patrocinador na diretoria.",
  fnt_oficial: "Declarar e comunicar a fonte oficial de cada informação crítica.",
  fnt_arquitetura: "Criar banco consolidado (camada prata) com carga agendada das fontes críticas.",
  fnt_acesso: "Levantar e validar acesso via API/banco das fontes críticas e registrar a dificuldade de cada uma.",
  qual_confianca: "Rodar teste de conciliação entre fontes para medir a confiabilidade real dos números.",
  qual_monitor: "Implantar 3 checagens diárias de qualidade com steward responsável.",
  qual_premissas: "Documentar premissas dos 5 KPIs críticos no Glossário e validar com o owner.",
  int_chave: "Construir e validar a tabela mestra de-para (DIM) de SKU entre sistemas.",
  int_consol: "Substituir consolidação manual por pipeline usando a DIM como chave.",
  int_linhagem: "Mapear a linhagem (fonte → transformação → painel) dos KPIs críticos.",
  gov_owner: "Nomear Data Owner e Steward para cada domínio crítico.",
  gov_glossario: "Publicar o Glossário de KPIs com definição, fórmula, owner e fonte.",
  gov_processo: "Documentar fechamento, cargas e correção de cadastro em procedimento de 1 página.",
  seg_cred: "Inventariar credenciais e migrar para cofre de senhas com responsável.",
  seg_acesso: "Classificar dados por sensibilidade e revisar perfis de acesso.",
  seg_lgpd: "Mapear dados pessoais por fonte e definir base legal e acesso restrito.",
  pes_skill: "Trilha de capacitação SQL/BI com tempo protegido para o time de dados.",
  pes_dependencia: "Documentar rotinas críticas e treinar um backup para a pessoa-chave.",
  pes_adocao: "Levar os painéis para as reuniões de rotina e retirar relatórios paralelos.",
  ia_automacao: "Automatizar a rotina manual de dados que mais consome horas.",
  ia_uso: "Selecionar um caso de IA com dado governado e medir contra baseline.",
  ia_dados: "Preparar o dataset do caso de IA priorizado (qualidade + histórico).",
};

export interface ActionItem {
  id: string;
  title: string;
  origin: string;
  wave: 1 | 2 | 3;
  priority: number;
  reason: string;
}

export const WAVES = {
  1: { label: "Onda 1 · 0–30 dias", focus: "Fundações: owner, chave mestra, fontes oficiais, riscos críticos" },
  2: { label: "Onda 2 · 30–60 dias", focus: "Estrutura: consolidação, glossário, monitoramento de qualidade" },
  3: { label: "Onda 3 · 60–90 dias", focus: "Escala: automação, adoção e casos avançados" },
} as const;

const FOUNDATION_DIMS = new Set(["governanca", "integracao", "fontes"]);

export function buildActionPlan(a: Pick<Assessment, "answers" | "context">, score: ScoreResult): ActionItem[] {
  const answers = a.answers || {};
  const items: ActionItem[] = [];
  const gateIds = new Set(score.gates.map((g) => g.questionId));

  for (const dim of DIMENSIONS)
    for (const q of dim.questions) {
      const s = questionScore(q, answers[q.id]);
      if (s === null || s >= 67) continue;
      const gap = (100 - s) / 100;
      const isGate = gateIds.has(q.id);
      const priority = gap * dim.weight * (isGate ? 2 : 1) * (FOUNDATION_DIMS.has(dim.key) ? 1.3 : 1);
      const wave: 1 | 2 | 3 = isGate || (FOUNDATION_DIMS.has(dim.key) && s < 40) ? 1 : s < 40 ? 2 : 3;
      items.push({
        id: q.id,
        title: QUESTION_ACTIONS[q.id] || q.prompt,
        origin: `${dim.code} · ${dim.title}`,
        wave,
        priority,
        reason: answers[q.id] === UNKNOWN ? "Resposta 'Não sei' — ponto cego" : isGate ? "Limita o nível geral" : `Score ${Math.round(s)}%`,
      });
    }

  for (const d of scopedDomains(a))
    for (const c of d.checks) {
      const s = checkScore(answers[c.id]);
      if (s === null || s >= 100) continue;
      const gap = (100 - s) / 100;
      const priority = gap * (c.critical ? 1.6 : 1);
      const wave: 1 | 2 | 3 = c.critical && s < 50 ? 1 : s < 50 ? 2 : 3;
      items.push({
        id: c.id,
        title: c.action,
        origin: d.title,
        wave,
        priority,
        reason: answers[c.id] === UNKNOWN ? "Ninguém soube responder" : c.critical ? "Ponto crítico de consistência" : "Controle parcial",
      });
    }

  return items.sort((x, y) => x.wave - y.wave || y.priority - x.priority);
}
