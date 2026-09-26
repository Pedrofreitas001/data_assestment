// Dados fictícios para o modo demonstração (sem Supabase configurado).
import { KPI_LIBRARY } from "../model/kpiLibrary";
import type { Assessment, Kpi, Organization, Profile, TableName } from "../model/types";
import { scoreAssessment } from "../model/scoring";

const ORG_A = "00000000-0000-4000-8000-00000000000a";
const ORG_B = "00000000-0000-4000-8000-00000000000b";
export const DEMO_USER_ID = "00000000-0000-4000-8000-0000000000ff";

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

export function demoSeed(): Record<TableName, unknown[]> {
  const orgs: Organization[] = [
    { id: ORG_A, name: "Casa Aurora Utilidades", segment: "Varejo omnichannel", size: "51 a 200", city: "Campinas/SP", contact_name: "Marina (Diretora Comercial)", contact_email: "marina@exemplo.com", status: "ativo", notes: "12 lojas + e-commerce VTEX + 1 CD próprio.", created_at: daysAgo(30), updated_at: daysAgo(1) },
    { id: ORG_B, name: "Rota Sul Logística", segment: "Operador logístico / Transportadora", size: "201 a 500", city: "Joinville/SC", contact_name: "Carlos (Gerente de Operações)", contact_email: "carlos@exemplo.com", status: "ativo", notes: "Armazenagem e transporte fracionado para 40 clientes.", created_at: daysAgo(60), updated_at: daysAgo(8) },
  ];

  const answersA: Record<string, number> = {
    est_uso: 3, est_producao: 3, est_prioridade: 2,
    fnt_oficial: 2, fnt_arquitetura: 2, fnt_acesso: 2,
    qual_confianca: 4, qual_monitor: 1, qual_premissas: 2,
    int_chave: 2, int_consol: 2, int_linhagem: 2,
    gov_owner: 2, gov_glossario: 1, gov_processo: 1,
    seg_cred: 2, seg_acesso: 2, seg_lgpd: 0,
    pes_skill: 2, pes_dependencia: 1, pes_adocao: 2,
    ia_automacao: 2, ia_uso: 2, ia_dados: 1,
    com_fat_bate: 2, com_devolucao: 1, com_preco: 1, com_cliente_dup: 0,
    est_acuracidade: 2, est_erp_wms: 1, est_negativo: 2, est_ruptura: 1, est_atualizacao: 2,
    ecm_pedidos_erp: 2, ecm_sku_map: 1, ecm_roi: 1, ecm_estoque_sync: 2,
    cad_regra: 1, cad_hierarquia: 2, cad_completo: 0, cad_unidade: 2,
  };
  const assessA: Assessment = {
    id: "00000000-0000-4000-8000-0000000000a1", organization_id: ORG_A,
    title: "Diagnóstico inicial — Fase 0", scope: "Empresa toda (Comercial, Estoque, E-commerce, Cadastro)", respondent: "Marina (Dir. Comercial) + Tiago (Analista BI)",
    status: "em_revisao",
    context: {
      segmento: "Varejo omnichannel", porte: "51 a 200", faturamento: "R$ 60–80 mi/ano", lojas_cds: "12 lojas, 1 CD", skus: "~8.500 SKUs ativos",
      sistemas: ["TOTVS Winthor", "VTEX", "Excel / Google Sheets", "Power BI", "Mercado Livre"], time_dados: "1 analista de BI + apoio de TI terceirizado",
      dores: "Faturamento da VTEX não bate com o ERP; ninguém confia no saldo de estoque do site; relatório de vendas leva 2 dias para sair.",
      objetivo: "Visão diária consolidada de venda e estoque por SKU e canal.",
      dominios: ["comercial", "estoque", "ecommerce", "cadastro"],
    },
    answers: answersA,
    evidence: { qual_confianca: "Diretoria afirma confiar, mas o analista refaz os números toda segunda.", int_chave: "Existe planilha DE-PARA VTEX×Winthor mantida pelo Tiago, cobre ~70% dos SKUs." },
    ai_insights: null, score: null, level: null, created_by: DEMO_USER_ID, created_at: daysAgo(6), updated_at: daysAgo(1),
  };
  const sA = scoreAssessment(assessA);
  assessA.score = sA.overall; assessA.level = sA.band?.level ?? null;

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
    id: "00000000-0000-4000-8000-0000000000b1", organization_id: ORG_B, title: "Assessment anual 2026", scope: "Operações + Financeiro", respondent: "Carlos (Ger. Operações)",
    status: "concluido",
    context: { segmento: "Operador logístico / Transportadora", porte: "201 a 500", sistemas: ["WMS próprio", "TMS", "Senior", "Power BI"], dominios: ["logistica", "estoque", "financeiro"], dores: "Faturas de frete com divergência; OTIF discutido com cada cliente." },
    answers: answersB, evidence: {}, ai_insights: null, score: null, level: null, created_by: DEMO_USER_ID, created_at: daysAgo(20), updated_at: daysAgo(8),
  };
  const sB = scoreAssessment(assessB);
  assessB.score = sB.overall; assessB.level = sB.band?.level ?? null;

  const lib = (key: string) => KPI_LIBRARY.find((k) => k.key === key)!;
  const kpiFrom = (key: string, id: string, extra: Partial<Kpi>): Kpi => {
    const { key: _k, ...t } = lib(key);
    void _k;
    return { ...t, id, organization_id: ORG_A, owner: null, steward: null, status: "rascunho", version: "1.0", notes: null, created_at: daysAgo(4), updated_at: daysAgo(2), ...extra };
  };
  const kpis: Kpi[] = [
    kpiFrom("faturamento_liquido", "00000000-0000-4000-8000-00000000e001", { owner: "Marina (Dir. Comercial)", steward: "Tiago (Analista BI)", status: "em_validacao", notes: "Diverge ~3% entre VTEX e Winthor: VTEX usa data do pedido, Winthor a data da NF." }),
    kpiFrom("ruptura", "00000000-0000-4000-8000-00000000e002", { owner: null, steward: "Tiago (Analista BI)" }),
    kpiFrom("acuracidade_inventario", "00000000-0000-4000-8000-00000000e003", { owner: null, status: "rascunho" }),
  ];

  const profiles: Profile[] = [{ id: DEMO_USER_ID, email: "gestora@moulis.demo", full_name: "Gestora Moulis (demo)", role: "admin", organization_id: null, created_at: daysAgo(90) }];

  return { organizations: orgs, assessments: [assessA, assessB], kpis, profiles };
}
