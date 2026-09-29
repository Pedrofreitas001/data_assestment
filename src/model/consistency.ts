// Regras determinísticas de consistência entre respostas.
// Objetivo: tornar o diagnóstico ASSERTIVO — respostas que se contradizem
// viram alerta para validar com evidência antes de fechar o nível.
import { DOMAINS, NOT_APPLICABLE, UNKNOWN, sectorOf } from "./framework";
import type { Assessment } from "./types";
import { scopedDomains } from "./scoring";

export interface ConsistencyAlert {
  id: string;
  severity: "alta" | "media";
  title: string;
  detail: string;
  refs: string[];
}

type A = Record<string, number | undefined>;
const known = (v: number | undefined) => typeof v === "number" && v !== UNKNOWN && v !== NOT_APPLICABLE;
const ge = (a: A, id: string, n: number) => known(a[id]) && (a[id] as number) >= n;
const le = (a: A, id: string, n: number) => known(a[id]) && (a[id] as number) <= n;

interface Rule {
  id: string;
  severity: "alta" | "media";
  title: string;
  detail: string;
  refs: string[];
  when: (a: A, ctx: Assessment["context"]) => boolean;
}

const RULES: Rule[] = [
  {
    id: "confianca_sem_base",
    severity: "alta",
    title: "Confiança nos dados possivelmente superestimada",
    detail: "A confiança declarada é alta, mas a consolidação é manual ou não há conferência de qualidade. Sem controle, erros passam despercebidos — valide com uma conciliação real.",
    refs: ["qual_confianca", "int_consol", "qual_monitor"],
    when: (a) => ge(a, "qual_confianca", 3) && (le(a, "int_consol", 2) || le(a, "qual_monitor", 1)),
  },
  {
    id: "base_sem_glossario",
    severity: "alta",
    title: "Base central sem definição dos indicadores",
    detail: "Os dados já estão consolidados, mas os indicadores não têm definição escrita. O risco é cada área calcular do seu jeito sobre a mesma base. Escreva o Glossário antes de ampliar o acesso.",
    refs: ["fnt_arquitetura", "int_consol", "gov_glossario"],
    when: (a) => (ge(a, "fnt_arquitetura", 3) || ge(a, "int_consol", 4)) && le(a, "gov_glossario", 1),
  },
  {
    id: "glossario_sem_owner",
    severity: "media",
    title: "Definições escritas sem responsável",
    detail: "Os indicadores têm definição, mas ninguém responde formalmente por ela. Quem valida uma mudança de regra? Nomeie o responsável de cada indicador crítico.",
    refs: ["gov_glossario", "gov_owner"],
    when: (a) => ge(a, "gov_glossario", 3) && le(a, "gov_owner", 1),
  },
  {
    id: "owner_sem_decisao",
    severity: "media",
    title: "Responsável formal, mas divergências sem solução",
    detail: "Há responsável pelos dados, porém as divergências entre áreas não se resolvem. Na prática o papel ainda não tem autoridade — combine com a diretoria que a definição escrita prevalece.",
    refs: ["gov_owner", "gov_decisao"],
    when: (a) => ge(a, "gov_owner", 3) && le(a, "gov_decisao", 1),
  },
  {
    id: "ia_sem_regra",
    severity: "alta",
    title: "Casos de IA sem regra de uso",
    detail: "A empresa já tem casos de IA em vista, mas não há regra sobre quais dados podem ir para essas ferramentas. Defina a política antes de ampliar o uso — especialmente com dados de clientes.",
    refs: ["ia_dados", "ia_politica"],
    when: (a) => ge(a, "ia_dados", 2) && le(a, "ia_politica", 1),
  },
  {
    id: "ia_sem_qualidade",
    severity: "alta",
    title: "Dados 'prontos para IA' sem conferência de qualidade",
    detail: "Os dados são considerados prontos para IA, mas ninguém confere a qualidade em rotina. Modelos herdam os erros da base — valide D3 antes de escalar.",
    refs: ["ia_dados", "qual_monitor"],
    when: (a) => ge(a, "ia_dados", 3) && le(a, "qual_monitor", 1),
  },
  {
    id: "estrategico_sem_tempo",
    severity: "media",
    title: "Decisão diária com dado de difícil acesso",
    detail: "Os dados orientam o dia a dia, mas a extração depende de exportação manual. Verifique a defasagem real dos números usados nas decisões.",
    refs: ["est_uso", "fnt_acesso"],
    when: (a) => ge(a, "est_uso", 4) && le(a, "fnt_acesso", 1),
  },
  {
    id: "uso_sem_letramento",
    severity: "media",
    title: "Rotina de indicadores, mas gestores dependem de tradução",
    detail: "Os indicadores estão nas reuniões, mas a maioria dos gestores não os interpreta sem ajuda. O ritual existe; falta formação prática de leitura de indicadores.",
    refs: ["est_uso", "pes_letramento"],
    when: (a) => ge(a, "est_uso", 3) && le(a, "pes_letramento", 1),
  },
  {
    id: "resultado_sem_uso",
    severity: "media",
    title: "Resultados medidos, mas decisões sem dados",
    detail: "A empresa diz comparar antes × depois das iniciativas, mas não usa dados nas decisões. Confira se a medição acontece de fato ou só em casos pontuais.",
    refs: ["est_resultado", "est_uso"],
    when: (a) => ge(a, "est_resultado", 3) && le(a, "est_uso", 1),
  },
  {
    id: "automacao_fragil",
    severity: "media",
    title: "Automação frágil (dependência de pessoa-chave)",
    detail: "Há automação relevante, mas o conhecimento está concentrado em uma pessoa. Documente as rotinas e treine um substituto.",
    refs: ["ia_automacao", "pes_dependencia"],
    when: (a) => ge(a, "ia_automacao", 3) && le(a, "pes_dependencia", 1),
  },
  {
    id: "base_sem_backup",
    severity: "media",
    title: "Base central sem cópia de segurança garantida",
    detail: "Os dados estão consolidados numa base central, mas não se sabe se há backup. Uma falha apagaria o histórico que sustenta os relatórios.",
    refs: ["fnt_arquitetura", "fnt_backup"],
    when: (a) => ge(a, "fnt_arquitetura", 3) && le(a, "fnt_backup", 1),
  },
  {
    id: "correcao_sem_monitor",
    severity: "media",
    title: "Correção na origem sem conferência recorrente",
    detail: "Os erros são corrigidos na origem, mas ninguém confere a qualidade em rotina — então só são corrigidos os que alguém percebe. Confirme como os erros chegam a ser encontrados.",
    refs: ["qual_correcao", "qual_monitor"],
    when: (a) => ge(a, "qual_correcao", 3) && le(a, "qual_monitor", 1),
  },
  {
    id: "integracao_sem_chave",
    severity: "alta",
    title: "Consolidação automática sem código comum",
    detail: "A consolidação é automatizada, mas não há código comum validado entre os sistemas. Automação sem chave confiável acelera o erro.",
    refs: ["int_consol", "int_chave"],
    when: (a) => ge(a, "int_consol", 4) && le(a, "int_chave", 2),
  },
  {
    id: "lgpd_exposicao",
    severity: "alta",
    title: "Dados pessoais sem mapeamento num setor exposto",
    detail: "O setor lida com muitos dados de pessoas físicas (ou dados sensíveis), mas não se sabe onde eles estão. Exposição direta à LGPD — mapeie antes de integrar novas fontes.",
    refs: ["seg_lgpd"],
    when: (a, ctx) => le(a, "seg_lgpd", 1) && ["comercio", "saude", "educacao", "logistica"].includes(sectorOf(ctx?.segmento)),
  },
  {
    id: "credencial_api",
    severity: "media",
    title: "Acesso direto aos sistemas com senhas sem controle",
    detail: "Há extração por API ou banco, mas as credenciais estão com pessoas ou em e-mails. Faça o inventário de acessos com responsável e guarde num cofre de senhas.",
    refs: ["fnt_acesso", "seg_cred"],
    when: (a) => ge(a, "fnt_acesso", 3) && le(a, "seg_cred", 2),
  },
  {
    id: "estoque_acur_sem_conc",
    severity: "media",
    title: "Acuracidade de estoque sem conciliação de saldos",
    detail: "A acuracidade é medida, mas os saldos do sistema e do controle físico não são conciliados. A medição pode estar comparando com a base errada.",
    refs: ["est_acuracidade", "est_erp_wms"],
    when: (a) => ge(a, "est_acuracidade", 3) && le(a, "est_erp_wms", 1),
  },
  {
    id: "margem_custo",
    severity: "alta",
    title: "Margem calculada sobre custo não confiável",
    detail: "A DRE é acompanhada, mas o custo não é atualizado com regra definida. Margens por produto, serviço ou contrato podem estar distorcidas.",
    refs: ["fin_dre", "cmp_custo"],
    when: (a) => ge(a, "fin_dre", 2) && le(a, "cmp_custo", 1),
  },
  {
    id: "margem_horas",
    severity: "alta",
    title: "Rentabilidade por contrato sem apontamento de horas completo",
    detail: "A rentabilidade por contrato é calculada, mas as horas não são apontadas de forma completa. A margem tende a parecer maior do que é.",
    refs: ["prj_rentab", "prj_horas"],
    when: (a) => ge(a, "prj_rentab", 2) && le(a, "prj_horas", 1),
  },
];

export function consistencyAlerts(assessment: Pick<Assessment, "answers" | "context">): ConsistencyAlert[] {
  const a = assessment.answers || {};
  const out: ConsistencyAlert[] = RULES.filter((r) => r.when(a, assessment.context)).map(
    ({ id, severity, title, detail, refs }) => ({ id, severity, title, detail, refs }),
  );

  // Domínios com mais da metade das respostas "Não sei" = sem visibilidade.
  for (const d of scopedDomains(assessment)) {
    const answered = d.checks.filter((c) => typeof a[c.id] === "number");
    const unknown = answered.filter((c) => a[c.id] === UNKNOWN);
    if (answered.length >= 2 && unknown.length / answered.length >= 0.5)
      out.push({
        id: `cego_${d.key}`,
        severity: "media",
        title: `${d.title}: domínio sem visibilidade`,
        detail: `${unknown.length} de ${answered.length} pontos de consistência responderam "Não sei". Envolva o owner/steward do domínio antes de concluir.`,
        refs: unknown.map((c) => c.id),
      });
  }
  return out;
}

export const DOMAIN_KEYS = DOMAINS.map((d) => d.key);
