// =====================================================================
// PRIORIZAÇÃO DAS ÁREAS — valor em jogo × prontidão para executar.
//
// A área com pior maturidade nem sempre é a que traz mais resultado.
// Cada área recebe campos em FAIXAS (receita, verba, frete, folha…) e
// uma alavanca de melhoria conservadora por campo. O app estima o valor
// anual em jogo, cruza com a prontidão (maturidade da área + patrocinador)
// e sugere a ordem de ataque. Tudo é estimativa de ordem de grandeza,
// com premissas visíveis — não promessa de ganho.
// =====================================================================
import { DOMAINS, type OpDomain } from "./framework";
import { domainScore, scopedDomains } from "./scoring";
import type { Assessment } from "./types";

// ---------------------------------------------------------------------
// Faixas
// ---------------------------------------------------------------------
export interface BandOpt {
  v: number;
  label: string;
  /** Valor representativo da faixa (média geométrica dos limites — conservador). */
  mid: number;
}

/** R$ por ano. */
export const MONEY_BANDS: BandOpt[] = [
  { v: 1, label: "Até R$ 100 mil", mid: 50e3 },
  { v: 2, label: "R$ 100 a 500 mil", mid: 224e3 },
  { v: 3, label: "R$ 500 mil a 1 mi", mid: 707e3 },
  { v: 4, label: "R$ 1 a 5 mi", mid: 2.24e6 },
  { v: 5, label: "R$ 5 a 20 mi", mid: 10e6 },
  { v: 6, label: "R$ 20 a 100 mi", mid: 44.7e6 },
  { v: 7, label: "Acima de R$ 100 mi", mid: 150e6 },
];

export const PEOPLE_BANDS: BandOpt[] = [
  { v: 1, label: "1 a 2 pessoas", mid: 1.5 },
  { v: 2, label: "3 a 5", mid: 4 },
  { v: 3, label: "6 a 10", mid: 8 },
  { v: 4, label: "11 a 25", mid: 17 },
  { v: 5, label: "26 a 50", mid: 36 },
  { v: 6, label: "51 a 100", mid: 71 },
  { v: 7, label: "Mais de 100", mid: 130 },
];

/** Custo mensal médio por pessoa, com encargos. */
export const SALARY_BANDS: BandOpt[] = [
  { v: 1, label: "Até R$ 4 mil/mês", mid: 3e3 },
  { v: 2, label: "R$ 4 a 8 mil", mid: 5.7e3 },
  { v: 3, label: "R$ 8 a 15 mil", mid: 11e3 },
  { v: 4, label: "R$ 15 a 25 mil", mid: 19.4e3 },
  { v: 5, label: "Acima de R$ 25 mil", mid: 30e3 },
];

/** 12 salários + 13º + 1/3 de férias. */
const MONTHS_PER_YEAR = 13.33;

// ---------------------------------------------------------------------
// Campos por área
// ---------------------------------------------------------------------
export interface Driver {
  key: string;
  label: string;
  hint?: string;
  kind: "money" | "team";
  /** Parcela recuperável estimada [conservador, otimista]. */
  lever: [number, number];
  /** De onde vem o ganho, em uma frase. */
  why: string;
}

const TEAM: Driver = {
  key: "equipe",
  label: "Pessoas na área e custo médio mensal",
  kind: "team",
  lever: [0.03, 0.08],
  why: "Horas hoje gastas com retrabalho, conferência manual e busca de dados (3% a 8% da folha da área).",
};
const SYSTEMS: Driver = {
  key: "sistemas",
  label: "Gasto anual com sistemas e informação da área",
  hint: "Softwares, BI, relatórios, bases de dados e consultorias.",
  kind: "money",
  lever: [0.05, 0.15],
  why: "Licenças sem uso, ferramentas duplicadas e relatórios pagos que ninguém usa.",
};

const m = (key: string, label: string, lever: [number, number], why: string, hint?: string): Driver => ({ key, label, kind: "money", lever, why, hint });

export const AREA_DRIVERS: Record<string, Driver[]> = {
  comercial: [
    m("receita", "Receita anual que passa pela área", [0.005, 0.02], "Preço e desconto com histórico, melhor conversão de propostas e clientes inativos recuperados."),
    m("descontos", "Descontos e bonificações concedidos por ano", [0.05, 0.15], "Desconto fora da política passa a ser visto e controlado."),
  ],
  marketing: [
    m("verba", "Investimento anual em marketing", [0.1, 0.25], "Verba realocada de canais sem retorno para os que vendem — só possível com origem e custo por canal.", "Mídia, agência, eventos, brindes e ferramentas."),
    m("receita_mkt", "Receita vinda de contatos gerados pelo marketing", [0.01, 0.03], "Melhor conversão e reativação da base com origem confiável."),
  ],
  financeiro: [
    m("inadimplencia", "Valor em atraso ou inadimplente por ano", [0.05, 0.15], "Cobrança priorizada com dados confiáveis de vencimento e cliente."),
    m("juros", "Juros, multas e tarifas pagos por ano", [0.1, 0.3], "Pagamentos fora do prazo e tarifas que hoje passam despercebidas."),
  ],
  pessoas: [
    m("folha", "Folha de pagamento anual da empresa (com encargos)", [0.005, 0.015], "Horas extras, erros de folha e absenteísmo visíveis por área e gestor."),
    m("desligamentos", "Custo anual com desligamentos e reposição", [0.05, 0.15], "Rotatividade com causa medida: rescisão, recrutamento e treinamento evitados.", "Rescisões, recrutamento e treinamento de quem entra."),
  ],
  operacoes: [
    m("custo_operacao", "Custo anual da operação ou da entrega do serviço", [0.01, 0.03], "Prazo, retrabalho e produtividade medidos com a mesma regra."),
    m("retrabalho", "Custo anual com retrabalho, garantia e reclamações", [0.1, 0.25], "Causas do retrabalho registradas e atacadas na origem."),
  ],
  compras: [m("compras", "Volume anual de compras", [0.01, 0.03], "Negociação com histórico de preço e de fornecedor, sem compras duplicadas.")],
  cadastro: [m("erros_cadastro", "Perdas anuais por erro de cadastro", [0.2, 0.4], "Nota, imposto, entrega ou cobrança erradas por cadastro incompleto.", "Notas canceladas, entregas erradas, impostos recolhidos errado.")],
  estoque: [
    m("valor_estoque", "Valor médio parado em estoque", [0.03, 0.08], "Capital liberado com menos excesso e obsolescência."),
    m("ruptura", "Venda perdida por falta de produto (estimativa anual)", [0.2, 0.4], "Parte da venda perdida volta quando a falta é medida item a item."),
  ],
  logistica: [
    m("frete", "Gasto anual com frete", [0.03, 0.08], "Auditoria de frete (tabela × CT-e × fatura) e melhor escolha de transportadora."),
    m("armazenagem", "Custo anual de armazenagem e expedição", [0.02, 0.05], "Produtividade e ocupação medidas por operação."),
  ],
  ecommerce: [
    m("receita_online", "Receita anual dos canais digitais", [0.01, 0.03], "Conversão maior, estoque sincronizado e menos cancelamento."),
    m("midia_digital", "Investimento anual em mídia digital", [0.1, 0.2], "Verba concentrada nas campanhas que dão margem, não só volume."),
  ],
  producao: [
    m("custo_producao", "Custo anual de produção (materiais + transformação)", [0.01, 0.03], "Estrutura de produto e apontamento corretos: custo real e menos perda."),
    m("refugo", "Perda anual com refugo e retrabalho", [0.1, 0.25], "Refugo com causa registrada por linha e produto."),
  ],
  projetos: [m("receita_servicos", "Receita anual de contratos e projetos", [0.01, 0.03], "Horas não faturadas e contratos deficitários aparecem a tempo de agir.")],
};

export function driversFor(domainKey: string): Driver[] {
  return [...(AREA_DRIVERS[domainKey] || []), TEAM, SYSTEMS];
}

// ---------------------------------------------------------------------
// Entradas (o que é salvo)
// ---------------------------------------------------------------------
export type Sponsor = "sim" | "informal" | "nao";
export type DriverValue = number | { p?: number; c?: number };

export interface AreaInput {
  drivers?: Record<string, DriverValue>;
  /** 1 a 5 — importância na estratégia da diretoria. */
  estrategia?: number;
  patrocinador?: Sponsor;
  /** Faixa de retorno já medido depois das ações (acompanhamento). */
  retorno?: number;
  nota?: string;
}

export interface ImpactMap {
  id: string;
  organization_id: string;
  areas: Record<string, AreaInput>;
  /** Ordem decidida pela gestão (null = segue a sugestão do app). */
  manual_order: string[] | null;
  /** Por que a ordem decidida difere da sugerida, por área. */
  justifications: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

export const STRATEGY_LABELS: Record<number, string> = { 1: "Baixa", 2: "Média-baixa", 3: "Média", 4: "Alta", 5: "Prioridade máxima" };
export const SPONSOR_OPTIONS: { key: Sponsor; label: string }[] = [
  { key: "sim", label: "Sim, na diretoria" },
  { key: "informal", label: "Informal" },
  { key: "nao", label: "Não" },
];

// ---------------------------------------------------------------------
// Cálculos
// ---------------------------------------------------------------------
const mid = (bands: BandOpt[], v?: number) => bands.find((b) => b.v === v)?.mid;

export interface DriverResult {
  driver: Driver;
  base: number | null;
  low: number;
  high: number;
}

export function driverResult(d: Driver, value: DriverValue | undefined): DriverResult {
  let base: number | null = null;
  if (d.kind === "money" && typeof value === "number") base = mid(MONEY_BANDS, value) ?? null;
  if (d.kind === "team" && value && typeof value === "object") {
    const p = mid(PEOPLE_BANDS, value.p);
    const c = mid(SALARY_BANDS, value.c);
    if (p && c) base = p * c * MONTHS_PER_YEAR;
  }
  return { driver: d, base, low: base ? base * d.lever[0] : 0, high: base ? base * d.lever[1] : 0 };
}

export type Quadrant = "atacar" | "preparar" | "rapido" | "depois" | "sem_dados";

export const QUADRANTS: Record<Quadrant, { label: string; hint: string }> = {
  atacar: { label: "Atacar já", hint: "Muito valor em jogo e condições de executar." },
  preparar: { label: "Preparar", hint: "Muito valor, mas falta base: patrocinador, responsável ou fundamentos primeiro." },
  rapido: { label: "Ganho rápido", hint: "Pouco valor, mas fácil de fazer — bom para gerar confiança." },
  depois: { label: "Depois", hint: "Pouco valor e pouca prontidão agora." },
  sem_dados: { label: "Sem estimativa", hint: "Preencha ao menos um campo de valor para posicionar a área." },
};

export interface AreaResult {
  domain: OpDomain;
  input: AreaInput;
  /** Maturidade da área no diagnóstico (0–100) ou null se ainda não respondida. */
  maturity: number | null;
  answered: number;
  total: number;
  drivers: DriverResult[];
  filled: number;
  low: number;
  high: number;
  /** Ponto médio da faixa de valor anual em jogo. */
  value: number;
  /** 0–100: metade maturidade da área, metade patrocinador. */
  readiness: number;
  /** Valor ajustado à prontidão e ao peso estratégico — base do ranking sugerido. */
  expected: number;
  quadrant: Quadrant;
  suggestedRank: number;
}

function sponsorScore(s?: Sponsor) {
  return s === "sim" ? 100 : s === "informal" ? 50 : 0;
}

export function readinessOf(maturity: number | null, sponsor?: Sponsor) {
  // Sem respostas na área: assume prontidão baixa (30) até o diagnóstico chegar lá.
  return Math.round(0.5 * (maturity ?? 30) + 0.5 * sponsorScore(sponsor));
}

/** A partir daqui a área tem condições de executar (patrocinador + base mínima). */
export const READY_CUT = 45;

function strategyFactor(e?: number) {
  return e ? 0.6 + 0.2 * (e - 1) : 1;
}

/** Áreas do diagnóstico mais recente (as que entraram no escopo), com o cálculo de valor e prontidão. */
export function analyzeAreas(assessment: Pick<Assessment, "answers" | "context"> | null, map: Pick<ImpactMap, "areas"> | null): AreaResult[] {
  const answers = assessment?.answers || {};
  const domains = assessment ? scopedDomains(assessment) : DOMAINS.filter((d) => d.core);
  const rows = domains.map((domain): Omit<AreaResult, "quadrant" | "suggestedRank"> => {
    const input = map?.areas?.[domain.key] || {};
    const drivers = driversFor(domain.key).map((d) => driverResult(d, input.drivers?.[d.key]));
    const low = drivers.reduce((s, r) => s + r.low, 0);
    const high = drivers.reduce((s, r) => s + r.high, 0);
    const maturity = domainScore(domain, answers);
    const readiness = readinessOf(maturity, input.patrocinador);
    const value = (low + high) / 2;
    return {
      domain,
      input,
      maturity,
      answered: domain.checks.filter((c) => answers[c.id] !== undefined).length,
      total: domain.checks.length,
      drivers,
      filled: drivers.filter((r) => r.base !== null).length,
      low,
      high,
      value,
      readiness,
      expected: value * (0.5 + 0.5 * (readiness / 100)) * strategyFactor(input.estrategia),
    };
  });

  // "Muito valor" é relativo à própria empresa: acima da mediana das áreas estimadas.
  const values = rows.filter((r) => r.value > 0).map((r) => r.value).sort((a, b) => a - b);
  const median = values.length ? values[Math.floor((values.length - 1) / 2)] : 0;

  const sorted = [...rows].sort((a, b) => b.expected - a.expected || (a.maturity ?? 0) - (b.maturity ?? 0));
  return sorted.map((r, i) => {
    let quadrant: Quadrant = "sem_dados";
    if (r.value > 0) {
      const highValue = values.length === 1 || r.value >= median;
      const ready = r.readiness >= READY_CUT;
      quadrant = highValue ? (ready ? "atacar" : "preparar") : ready ? "rapido" : "depois";
    }
    return { ...r, quadrant, suggestedRank: i + 1 };
  });
}

/** Ordem final: a decidida pela gestão (com áreas novas no fim, na ordem sugerida) ou a sugerida. */
export function finalOrder(results: AreaResult[], manual: string[] | null | undefined): AreaResult[] {
  if (!manual?.length) return results;
  const byKey = new Map(results.map((r) => [r.domain.key, r]));
  const out = manual.map((k) => byKey.get(k)).filter((r): r is AreaResult => !!r);
  for (const r of results) if (!manual.includes(r.domain.key)) out.push(r);
  return out;
}

export function brl(v: number) {
  if (v >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (v >= 1e3) return `R$ ${Math.round(v / 1e3).toLocaleString("pt-BR")} mil`;
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

export function brlRange(low: number, high: number) {
  if (!high) return "—";
  return `${brl(low)} a ${brl(high)}`;
}
