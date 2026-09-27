// Gera supabase/seed_showcase.sql — dois diagnósticos de exemplo, completos e
// coerentes, prontos para apresentar (sócia, investidor, cliente em potencial).
// Usa o mesmo motor de cálculo do app, então nível/score saem sempre corretos.
//
// Uso: node --experimental-strip-types scripts/seed-showcase.ts
// Depois: cole o conteúdo de supabase/seed_showcase.sql no SQL Editor do
// Supabase de PRODUÇÃO e rode. É seguro rodar de novo (idempotente).
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { scoreAssessment } from "../src/model/scoring.ts";
import type { AiInsights, Assessment, Kpi, Organization } from "../src/model/types.ts";

const ORG_A = "10000000-0000-4000-8000-00000000000a";
const ORG_B = "10000000-0000-4000-8000-00000000000b";
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

const orgA: Organization = {
  id: ORG_A, name: "Casa Aurora Utilidades", segment: "Varejo omnichannel", size: "51 a 200", city: "Campinas/SP",
  contact_name: "Marina Alves (Diretora Comercial)", contact_email: "marina@casaaurora.exemplo.com", status: "ativo",
  notes: "12 lojas físicas + e-commerce (VTEX) + 1 CD próprio. Diagnóstico piloto do programa de maturidade de dados.",
};
const orgB: Organization = {
  id: ORG_B, name: "Rota Sul Logística", segment: "Operador logístico / Transportadora", size: "201 a 500", city: "Joinville/SC",
  contact_name: "Carlos Menezes (Gerente de Operações)", contact_email: "carlos@rotasul.exemplo.com", status: "ativo",
  notes: "Armazenagem e transporte fracionado para ~40 clientes contratantes.",
};

const answersA: Record<string, number> = {
  est_uso: 3, est_producao: 3, est_prioridade: 2,
  fnt_oficial: 2, fnt_arquitetura: 2, fnt_acesso: 2,
  qual_confianca: 4, qual_monitor: 1, qual_premissas: 2,
  int_chave: 2, int_consol: 2, int_linhagem: 2,
  gov_owner: 2, gov_glossario: 1, gov_processo: 1,
  seg_cred: 2, seg_acesso: 2, seg_lgpd: 1,
  pes_skill: 2, pes_dependencia: 1, pes_adocao: 2,
  ia_automacao: 2, ia_uso: 2, ia_dados: 1,
  com_fat_bate: 2, com_devolucao: 1, com_preco: 1, com_cliente_dup: 1,
  est_acuracidade: 2, est_erp_wms: 1, est_negativo: 2, est_ruptura: 1, est_atualizacao: 2,
  ecm_pedidos_erp: 2, ecm_sku_map: 1, ecm_roi: 1, ecm_estoque_sync: 2,
  cad_regra: 1, cad_hierarquia: 2, cad_completo: 1, cad_unidade: 2,
};
const assessA: Assessment = {
  id: "10000000-0000-4000-8000-0000000000a1", organization_id: ORG_A,
  title: "Diagnóstico inicial — Fase 0", scope: "Empresa toda (Comercial, Estoque, E-commerce, Cadastro)",
  respondent: "Marina Alves (Dir. Comercial) + Tiago Souza (Analista de BI)", status: "concluido",
  context: {
    segmento: "Varejo omnichannel", porte: "51 a 200", faturamento: "R$ 60–80 mi/ano", lojas_cds: "12 lojas, 1 CD",
    skus: "~8.500 SKUs ativos", sistemas: ["TOTVS Winthor", "VTEX", "Excel / Google Sheets", "Power BI", "Mercado Livre"],
    time_dados: "1 analista de BI + apoio de TI terceirizado",
    dores: "Faturamento da VTEX não bate com o ERP; ninguém confia no saldo de estoque do site; relatório de vendas leva 2 dias para sair.",
    objetivo: "Visão diária consolidada de venda e estoque por SKU e canal.",
    dominios: ["comercial", "estoque", "ecommerce", "cadastro"],
  },
  answers: answersA,
  evidence: {
    qual_confianca: "Diretoria afirma confiar, mas o analista refaz os números toda segunda.",
    int_chave: "Existe planilha DE-PARA VTEX×Winthor mantida pelo Tiago, cobre ~70% dos SKUs.",
  },
  ai_insights: null, score: null, level: null, report_notes: [], created_at: daysAgo(18), updated_at: daysAgo(2),
};

const answersB: Record<string, number> = {
  est_uso: 4, est_producao: 4, est_prioridade: 3, fnt_oficial: 3, fnt_arquitetura: 4, fnt_acesso: 3,
  qual_confianca: 3, qual_monitor: 3, qual_premissas: 3, int_chave: 3, int_consol: 4, int_linhagem: 3,
  gov_owner: 3, gov_glossario: 3, gov_processo: 2, seg_cred: 3, seg_acesso: 3, seg_lgpd: 3,
  pes_skill: 3, pes_dependencia: 3, pes_adocao: 3, ia_automacao: 3, ia_uso: 2, ia_dados: 2,
  log_otif_regra: 3, log_frete_conc: 2, log_entrega_real: 2, log_status: 3, log_cadastro: 2,
  est_acuracidade: 3, est_erp_wms: 3, est_negativo: 3, est_ruptura: 2, est_atualizacao: 3,
  fin_dre: 2, fin_rateio: 2, fin_fechamento: 2, fin_orcado: 1,
};
const assessB: Assessment = {
  id: "10000000-0000-4000-8000-0000000000b1", organization_id: ORG_B,
  title: "Assessment anual 2026", scope: "Operações + Financeiro", respondent: "Carlos Menezes (Ger. de Operações)",
  status: "concluido",
  context: {
    segmento: "Operador logístico / Transportadora", porte: "201 a 500",
    sistemas: ["WMS próprio", "TMS", "Senior", "Power BI"], dominios: ["logistica", "estoque", "financeiro"],
    dores: "Faturas de frete com divergência recorrente; OTIF discutido cliente a cliente, sem regra única.",
    objetivo: "Painel único de OTIF e custo de frete por cliente, sem retrabalho manual no fechamento.",
  },
  answers: answersB, evidence: {}, ai_insights: null, score: null, level: null, report_notes: [],
  created_at: daysAgo(40), updated_at: daysAgo(6),
};

const insightsA: Omit<AiInsights, "generated_at" | "model"> = {
  headline: "A operação decide com dados, mas sobre um estoque e um faturamento que ninguém concilia.",
  executive_summary:
    "A Casa Aurora está no nível 2 (Reativo): KPIs são acompanhados em rotina, mas a consolidação é manual e depende do analista de BI. Três fundamentos travam o avanço — não há Data Owner formal, a tabela que liga o SKU entre VTEX e Winthor cobre só 70% do catálogo, e não existe conferência de qualidade recorrente. Resolver esses três pontos em 30 dias já destrava o nível 3.",
  strengths: ["KPIs comerciais acompanhados em rotina semanal", "Time de BI já mapeou parte da chave de-para entre sistemas"],
  risks: [
    { title: "Faturamento reportado pode divergir do real", detail: "Pedidos do e-commerce e notas do ERP não são conciliados; a diretoria confia no número sem checagem.", severity: "alta" },
    { title: "Dependência de uma única pessoa", detail: "Toda a consolidação de vendas e estoque passa pelo analista de BI, sem backup documentado.", severity: "media" },
    { title: "Exposição de dados de clientes sem classificação", detail: "Cadastro do e-commerce contém CPF e endereço sem controle de acesso proporcional.", severity: "alta" },
  ],
  domain_insights: [
    { domain: "Estoque & Inventário", insight: "Saldo do ERP e do site divergem com frequência.", quick_win: "Conciliação diária dos 300 SKUs de maior giro entre Winthor e VTEX." },
    { domain: "Comercial & Vendas", insight: "Não há regra única de faturamento líquido.", quick_win: "Documentar no glossário como devoluções e descontos entram no cálculo." },
  ],
  roadmap: [
    { wave: "Onda 1 · 0–30 dias", actions: ["Nomear Data Owner e Steward para Comercial e Estoque", "Completar a tabela de-para de SKU para 100% do catálogo", "Mapear onde ficam os dados pessoais de clientes"] },
    { wave: "Onda 2 · 30–60 dias", actions: ["Publicar glossário dos 5 KPIs comerciais críticos", "Implantar conciliação diária ERP × e-commerce"] },
    { wave: "Onda 3 · 60–90 dias", actions: ["Automatizar o relatório de vendas hoje manual", "Levar o painel consolidado para a reunião semanal de diretoria"] },
  ],
  questions_for_next_meeting: ["Quem a diretoria indica como Data Owner de Comercial?", "Existe orçamento para migrar o de-para de planilha para o banco?"],
};

const insightsB: Omit<AiInsights, "generated_at" | "model"> = {
  headline: "Operação madura em rotina, mas o frete ainda é auditado na unha.",
  executive_summary:
    "A Rota Sul está no nível 3 (Definido): fontes e KPIs são conhecidos, com integração automatizada entre WMS, TMS e Power BI. O ponto mais frágil é a conciliação de frete — cada cliente questiona o OTIF com uma régua diferente, porque a regra nunca foi formalizada. Fechar essa definição é o que destrava o nível 4.",
  strengths: ["Consolidação automatizada entre WMS, TMS e ERP", "Ownership e stewardship já formalizados nos domínios críticos"],
  risks: [
    { title: "Disputas de OTIF por falta de regra única", detail: "Cada cliente contesta o indicador com critério próprio, gerando desgaste comercial recorrente.", severity: "alta" },
    { title: "Fatura de frete paga com possível cobrança indevida", detail: "CT-e e fatura da transportadora não são cruzados sistematicamente.", severity: "media" },
  ],
  domain_insights: [
    { domain: "Logística & Transporte", insight: "OTIF calculado sem regra publicada.", quick_win: "Formalizar no glossário a data prometida e a tolerância usadas no cálculo." },
    { domain: "Financeiro & FP&A", insight: "DRE gerencial fecha com 1 mês de defasagem.", quick_win: "Mapear o caminho crítico do fechamento para reduzir para 5 dias úteis." },
  ],
  roadmap: [
    { wave: "Onda 1 · 0–30 dias", actions: ["Publicar a regra oficial de cálculo do OTIF", "Auditoria de frete: tabela contratada × CT-e × fatura em uma amostra"] },
    { wave: "Onda 2 · 30–60 dias", actions: ["Implantar conciliação mensal de frete com fornecedor", "Padronizar critérios de rateio no fechamento financeiro"] },
    { wave: "Onda 3 · 60–90 dias", actions: ["Reduzir o fechamento gerencial para até 5 dias úteis", "Expor o OTIF por regra única no painel de clientes"] },
  ],
  questions_for_next_meeting: ["Qual tolerância de atraso será usada na regra oficial de OTIF?", "Há mandato para renegociar SLA de fatura com as transportadoras?"],
};

function finalize(a: Assessment, insights: Omit<AiInsights, "generated_at" | "model">, genDaysAgo: number) {
  const s = scoreAssessment(a);
  a.score = s.overall === null ? null : Math.round(s.overall * 100) / 100;
  a.level = s.band?.level ?? null;
  a.ai_insights = { ...insights, generated_at: daysAgo(genDaysAgo), model: "showcase" };
  return a;
}
finalize(assessA, insightsA, 2);
finalize(assessB, insightsB, 5);

const kpis: Kpi[] = [
  { id: "10000000-0000-4000-8000-00000000e001", organization_id: ORG_A, name: "Faturamento líquido", code: "COM-001", domain: "comercial",
    definition: "Receita de vendas após devoluções, cancelamentos e descontos incondicionais.", business_question: "Quanto vendemos de fato no período?",
    formula: "Σ valor faturado − Σ devoluções − Σ cancelamentos − Σ descontos incondicionais", numerator: "Valor faturado líquido", denominator: null,
    unit: "R$", granularity: "Dia × loja/canal × SKU", frequency: "Diária", direction: "maior_melhor", target: null,
    owner: "Marina Alves (Dir. Comercial)", steward: "Tiago Souza (Analista de BI)", assumptions: "Data de referência = emissão da NF.", exclusions: "Bonificações e transferências entre filiais.",
    source_tables: "ERP: notas fiscais de saída + devoluções", lineage: "ERP → prata.vendas → ouro.fato_vendas",
    quality_checks: "Conciliação mensal com contábil; dias sem faturamento por loja.", consumers: "Diretoria, Comercial, FP&A",
    status: "em_validacao", version: "1.0", notes: "Diverge ~3% entre VTEX e Winthor: VTEX usa data do pedido, Winthor a data da NF." },
  { id: "10000000-0000-4000-8000-00000000e002", organization_id: ORG_A, name: "Ruptura", code: "EST-002", domain: "estoque",
    definition: "Percentual de SKUs ativos sem estoque disponível para venda.", business_question: "Quanto do sortimento o cliente não encontra?",
    formula: "SKUs ativos com estoque disponível ≤ 0 ÷ SKUs ativos", numerator: "SKUs sem estoque", denominator: "SKUs ativos",
    unit: "%", granularity: "Dia × loja/CD × SKU", frequency: "Diária", direction: "menor_melhor", target: null,
    owner: null, steward: "Tiago Souza (Analista de BI)", assumptions: "SKU ativo = comercializável e não descontinuado.", exclusions: "SKUs sazonais fora de temporada.",
    source_tables: "fato_estoque_diario + dim_produto", lineage: null, quality_checks: null, consumers: "Comercial, Compras",
    status: "rascunho", version: "1.0", notes: null },
  { id: "10000000-0000-4000-8000-00000000f001", organization_id: ORG_B, name: "OTIF (On Time In Full)", code: "LOG-001", domain: "logistica",
    definition: "Percentual de pedidos entregues no prazo prometido e com a quantidade completa.", business_question: "Estamos cumprindo a promessa de entrega?",
    formula: "Pedidos no prazo e completos ÷ Pedidos com entrega prevista no período", numerator: "Pedidos no prazo e completos", denominator: "Pedidos com entrega prevista",
    unit: "%", granularity: "Dia × transportadora × região", frequency: "Diária", direction: "maior_melhor", target: "≥ 95%",
    owner: "Carlos Menezes (Ger. de Operações)", steward: "Equipe de Torre de Controle", assumptions: "Data prometida = informada ao cliente no pedido.", exclusions: "Pedidos cancelados antes da expedição.",
    source_tables: "TMS: eventos de entrega + ERP: pedidos", lineage: "TMS/ERP → prata.entregas → ouro.fato_otif",
    quality_checks: "Pedidos sem data de entrega real.", consumers: "Logística, SAC, Comercial", status: "validado", version: "1.1", notes: "Regra publicada no glossário em revisão de campo." },
];

const orgs = [orgA, orgB];
const assessments = [assessA, assessB];

const esc = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const jsonb = (v: unknown) => esc(JSON.stringify(v ?? null)) + "::jsonb";
const strOrNull = (v: string | null | undefined) => (v === null || v === undefined ? "null" : esc(v));
const numOrNull = (v: number | null | undefined) => (v === null || v === undefined ? "null" : String(v));

let sql = `-- =====================================================================
-- SEED DE APRESENTAÇÃO — dois diagnósticos completos, com nível e leitura
-- executiva já calculados, para mostrar o produto pronto (sócia, cliente
-- em potencial, investidor). Gerado por scripts/seed-showcase.ts.
--
-- Rode no SQL Editor do Supabase de PRODUÇÃO. Idempotente (pode rodar de
-- novo). Depois, dê a quem for apresentar um perfil 'consultor' ou 'admin'
-- (Clientes → Usuários) — assim ela enxerga as duas empresas no seletor da
-- barra lateral sem precisar estar vinculada a nenhuma delas.
-- =====================================================================

`;

for (const o of orgs) {
  sql += `insert into public.organizations (id, name, segment, size, city, contact_name, contact_email, status, notes)
values (${esc(o.id)}, ${esc(o.name)}, ${strOrNull(o.segment)}, ${strOrNull(o.size)}, ${strOrNull(o.city)}, ${strOrNull(o.contact_name)}, ${strOrNull(o.contact_email)}, ${esc(o.status)}, ${strOrNull(o.notes)})
on conflict (id) do update set name = excluded.name, segment = excluded.segment, size = excluded.size, city = excluded.city,
  contact_name = excluded.contact_name, contact_email = excluded.contact_email, status = excluded.status, notes = excluded.notes;

`;
}

for (const a of assessments) {
  sql += `insert into public.assessments (id, organization_id, title, scope, respondent, status, context, answers, evidence, ai_insights, report_notes, score, level)
values (${esc(a.id)}, ${esc(a.organization_id)}, ${esc(a.title)}, ${strOrNull(a.scope)}, ${strOrNull(a.respondent)}, ${esc(a.status)},
  ${jsonb(a.context)}, ${jsonb(a.answers)}, ${jsonb(a.evidence)}, ${jsonb(a.ai_insights)}, ${jsonb(a.report_notes)}, ${numOrNull(a.score)}, ${numOrNull(a.level)})
on conflict (id) do update set title = excluded.title, scope = excluded.scope, respondent = excluded.respondent, status = excluded.status,
  context = excluded.context, answers = excluded.answers, evidence = excluded.evidence, ai_insights = excluded.ai_insights,
  report_notes = excluded.report_notes, score = excluded.score, level = excluded.level;

`;
}

for (const k of kpis) {
  sql += `insert into public.kpis (id, organization_id, name, code, domain, definition, business_question, formula, numerator, denominator, unit, granularity, frequency, direction, target, owner, steward, assumptions, exclusions, source_tables, lineage, quality_checks, consumers, status, version, notes)
values (${esc(k.id)}, ${esc(k.organization_id)}, ${esc(k.name)}, ${strOrNull(k.code)}, ${strOrNull(k.domain)}, ${strOrNull(k.definition)}, ${strOrNull(k.business_question)},
  ${strOrNull(k.formula)}, ${strOrNull(k.numerator)}, ${strOrNull(k.denominator)}, ${strOrNull(k.unit)}, ${strOrNull(k.granularity)}, ${strOrNull(k.frequency)},
  ${strOrNull(k.direction)}, ${strOrNull(k.target)}, ${strOrNull(k.owner)}, ${strOrNull(k.steward)}, ${strOrNull(k.assumptions)}, ${strOrNull(k.exclusions)},
  ${strOrNull(k.source_tables)}, ${strOrNull(k.lineage)}, ${strOrNull(k.quality_checks)}, ${strOrNull(k.consumers)},
  ${esc(k.status)}, ${strOrNull(k.version)}, ${strOrNull(k.notes)})
on conflict (id) do update set name = excluded.name, definition = excluded.definition, formula = excluded.formula, owner = excluded.owner,
  steward = excluded.steward, assumptions = excluded.assumptions, source_tables = excluded.source_tables, quality_checks = excluded.quality_checks,
  consumers = excluded.consumers, status = excluded.status, notes = excluded.notes;

`;
}

sql += `-- Ajusta as datas para parecerem um histórico real (a IA/o app não usam isso para calcular nada).
update public.assessments set created_at = now() - interval '18 days', updated_at = now() - interval '2 days' where id = ${esc(assessA.id)};
update public.assessments set created_at = now() - interval '40 days', updated_at = now() - interval '6 days' where id = ${esc(assessB.id)};
update public.organizations set created_at = now() - interval '25 days', updated_at = now() - interval '2 days' where id = ${esc(ORG_A)};
update public.organizations set created_at = now() - interval '55 days', updated_at = now() - interval '6 days' where id = ${esc(ORG_B)};

notify pgrst, 'reload schema';
`;

writeFileSync(join(import.meta.dirname, "..", "supabase", "seed_showcase.sql"), sql);
console.log("supabase/seed_showcase.sql gerado.");
console.log(`- ${orgA.name}: nível ${assessA.level} · score ${assessA.score}`);
console.log(`- ${orgB.name}: nível ${assessB.level} · score ${assessB.score}`);
