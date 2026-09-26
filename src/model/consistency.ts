// Regras determinísticas de consistência entre respostas.
// Objetivo: tornar o diagnóstico ASSERTIVO — respostas que se contradizem
// viram alerta para validar com evidência antes de fechar o nível.
import { DOMAINS, UNKNOWN } from "./framework";
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
const known = (v: number | undefined) => typeof v === "number" && v !== UNKNOWN;
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
    detail: "A confiança declarada é alta, mas a consolidação é manual e não há monitoramento de qualidade. Sem controle, erros tendem a passar despercebidos — valide com um teste de conciliação real.",
    refs: ["qual_confianca", "int_consol", "qual_monitor"],
    when: (a) => ge(a, "qual_confianca", 4) && (le(a, "int_consol", 2) || le(a, "qual_monitor", 1)),
  },
  {
    id: "selfservice_sem_glossario",
    severity: "alta",
    title: "Self-service sem glossário = várias versões do mesmo KPI",
    detail: "Há BI avançado/self-service, mas não existe glossário de KPIs. O risco é cada área calcular o indicador do seu jeito. Priorize o Glossário de KPIs antes de ampliar acessos.",
    refs: ["est_producao", "gov_glossario"],
    when: (a) => ge(a, "est_producao", 4) && le(a, "gov_glossario", 1),
  },
  {
    id: "ia_sem_dados",
    severity: "alta",
    title: "IA à frente da base de dados",
    detail: "Existem pilotos/casos de IA, mas os dados necessários não estão prontos. Modelos herdam os problemas da base — resolva D3/D4 antes de escalar.",
    refs: ["ia_uso", "ia_dados", "qual_monitor"],
    when: (a) => ge(a, "ia_uso", 3) && (le(a, "ia_dados", 1) || le(a, "qual_monitor", 1)),
  },
  {
    id: "estrategico_sem_tempo",
    severity: "media",
    title: "Decisão estratégica com dado atrasado ou inacessível",
    detail: "A empresa declara usar dados para planejamento/decisões táticas, mas o acesso às fontes depende de extração manual. Verifique a defasagem real dos números usados nas decisões.",
    refs: ["est_uso", "fnt_acesso"],
    when: (a) => ge(a, "est_uso", 4) && le(a, "fnt_acesso", 1),
  },
  {
    id: "automacao_fragil",
    severity: "media",
    title: "Automação frágil (dependência de pessoa-chave)",
    detail: "Há automação relevante, mas o conhecimento está concentrado em uma pessoa. Documente as rotinas e defina um steward de backup.",
    refs: ["ia_automacao", "pes_dependencia"],
    when: (a) => ge(a, "ia_automacao", 3) && le(a, "pes_dependencia", 1),
  },
  {
    id: "owner_sem_processo",
    severity: "media",
    title: "Owner formal, mas sem processo documentado",
    detail: "O ownership está formalizado, porém os processos críticos não estão escritos. O owner vira gargalo: formalize ao menos fechamento, cargas e correção de cadastro.",
    refs: ["gov_owner", "gov_processo"],
    when: (a) => ge(a, "gov_owner", 3) && le(a, "gov_processo", 1),
  },
  {
    id: "integracao_sem_chave",
    severity: "alta",
    title: "Pipeline automatizado sem chave mestra",
    detail: "A consolidação é automatizada, mas não há tabela de-para (DIM) validada. Automação sem chave confiável acelera o erro — valide o SKU entre sistemas primeiro.",
    refs: ["int_consol", "int_chave"],
    when: (a) => ge(a, "int_consol", 4) && le(a, "int_chave", 2),
  },
  {
    id: "lgpd_b2c",
    severity: "alta",
    title: "Operação B2C sem mapeamento de dados pessoais",
    detail: "O segmento envolve consumidor final/entregas, mas não se sabe onde estão os dados pessoais. Exposição direta à LGPD — mapeie antes de integrar novas fontes.",
    refs: ["seg_lgpd"],
    when: (a, ctx) => le(a, "seg_lgpd", 1) && /varejo|e-commerce|omnichannel|operador|transport/i.test(ctx?.segmento || ""),
  },
  {
    id: "credencial_api",
    severity: "media",
    title: "APIs em uso com credenciais sem controle",
    detail: "Há extração por API, mas as credenciais estão com pessoas/e-mails. Registre-as no Catálogo (aba Credenciais) com responsável e local seguro — sem salvar o segredo.",
    refs: ["fnt_acesso", "seg_cred"],
    when: (a) => ge(a, "fnt_acesso", 3) && le(a, "seg_cred", 2),
  },
  {
    id: "estoque_acur_sem_conc",
    severity: "media",
    title: "Acuracidade de estoque sem conciliação ERP × WMS",
    detail: "A acuracidade é medida, mas os saldos de ERP e WMS não são conciliados. A medição pode estar comparando com a base errada.",
    refs: ["est_acuracidade", "est_erp_wms"],
    when: (a) => ge(a, "est_acuracidade", 3) && le(a, "est_erp_wms", 1),
  },
  {
    id: "margem_custo",
    severity: "alta",
    title: "Margem calculada sobre custo não confiável",
    detail: "A DRE/margem é acompanhada, mas o custo unitário por SKU não é atualizado com regra definida. Margens por produto podem estar distorcidas.",
    refs: ["fin_dre", "cmp_custo"],
    when: (a) => ge(a, "fin_dre", 2) && le(a, "cmp_custo", 1),
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
