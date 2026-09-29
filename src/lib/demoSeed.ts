// Dados fictícios para o modo demonstração (sem Supabase configurado).
import { KPI_LIBRARY } from "../model/kpiLibrary";
import type { Assessment, ChatThread, Kpi, Organization, Priority, Profile, TableName } from "../model/types";
import { scoreAssessment } from "../model/scoring";

const ORG_A = "00000000-0000-4000-8000-00000000000a";
const ORG_B = "00000000-0000-4000-8000-00000000000b";
export const DEMO_USER_ID = "00000000-0000-4000-8000-0000000000ff";

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

export function demoSeed(): Record<TableName, unknown[]> {
  const orgs: Organization[] = [
    { id: ORG_A, name: "Casa Aurora Utilidades", segment: "Varejo / E-commerce", size: "51 a 200", city: "Campinas/SP", contact_name: "Marina (Diretora Comercial)", contact_email: "marina@exemplo.com", status: "ativo", notes: "12 lojas + e-commerce VTEX + 1 CD próprio.", created_at: daysAgo(30), updated_at: daysAgo(1) },
    { id: ORG_B, name: "Rota Sul Logística", segment: "Logística / Transporte", size: "201 a 500", city: "Joinville/SC", contact_name: "Carlos (Gerente de Operações)", contact_email: "carlos@exemplo.com", status: "ativo", notes: "Armazenagem e transporte fracionado para 40 clientes.", created_at: daysAgo(60), updated_at: daysAgo(8) },
  ];

  const answersA: Record<string, number> = {
    est_uso: 3, est_prioridade: 2, est_resultado: 1,
    fnt_oficial: 2, fnt_arquitetura: 2, fnt_acesso: 2, fnt_backup: 2,
    qual_confianca: 3, qual_monitor: 1, qual_correcao: 1,
    int_chave: 2, int_consol: 2, int_linhagem: 2,
    gov_owner: 2, gov_glossario: 1, gov_decisao: 1,
    seg_cred: 2, seg_acesso: 2, seg_lgpd: 0,
    pes_skill: 3, pes_letramento: 2, pes_dependencia: 1, pes_adocao: 2,
    ia_automacao: 2, ia_politica: 1, ia_dados: 2,
    com_fat_bate: 2, com_devolucao: 1, com_funil: -1, com_preco: 1, com_cliente_dup: 0,
    fin_dre: 2, fin_rateio: 1, fin_fechamento: 2, fin_orcado: 1,
    rh_headcount: 2, rh_indicadores: 1, rh_matricula: 3, rh_ponto: 2,
    op_prazo: 1, op_registro: 2, op_status: 2, op_ocorrencias: 1,
    cmp_custo: 1, cmp_recebimento: 2, cmp_leadtime: 1, cmp_fornecedor_dup: 2,
    cad_regra: 1, cad_hierarquia: 2, cad_completo: 0, cad_sync: 1,
    est_acuracidade: 2, est_erp_wms: 1, est_negativo: 2, est_ruptura: 1, est_atualizacao: 2, cad_unidade: 2,
    ecm_pedidos_erp: 2, ecm_sku_map: 1, ecm_roi: 1, ecm_estoque_sync: 2,
  };
  const assessA: Assessment = {
    id: "00000000-0000-4000-8000-0000000000a1", organization_id: ORG_A,
    title: "Diagnóstico inicial — Fase 0", scope: "Empresa toda", respondent: "Marina (Dir. Comercial) + Tiago (Analista BI)",
    status: "em_revisao",
    context: {
      segmento: "Varejo / E-commerce", porte: "51 a 200", faturamento: "R$ 60–80 mi/ano", unidades: "12 lojas e 1 CD",
      sistemas: ["TOTVS", "VTEX", "Excel / Google Sheets", "Power BI", "Mercado Livre"], time_dados: "um",
      dores: "Faturamento da VTEX não bate com o ERP; ninguém confia no saldo de estoque do site; relatório de vendas leva 2 dias para sair.",
      objetivo: "confianca",
      dominios: ["comercial", "financeiro", "pessoas", "operacoes", "compras", "cadastro", "estoque", "ecommerce"],
      versao: 3,
    },
    answers: answersA,
    evidence: { qual_confianca: "Diretoria afirma confiar, mas o analista refaz os números toda segunda.", int_chave: "Existe planilha DE-PARA VTEX×Winthor mantida pelo Tiago, cobre ~70% dos SKUs." },
    ai_insights: null, score: null, level: null, created_by: DEMO_USER_ID, created_at: daysAgo(6), updated_at: daysAgo(1),
  };
  const sA = scoreAssessment(assessA);
  assessA.score = sA.overall; assessA.level = sA.band?.level ?? null;

  const answersB: Record<string, number> = {
    est_uso: 4, est_prioridade: 3, est_resultado: 3, fnt_oficial: 3, fnt_arquitetura: 4, fnt_acesso: 3, fnt_backup: 3,
    qual_confianca: 3, qual_monitor: 3, qual_correcao: 3, int_chave: 3, int_consol: 4, int_linhagem: 3,
    gov_owner: 3, gov_glossario: 3, gov_decisao: 2, seg_cred: 3, seg_acesso: 3, seg_lgpd: 3,
    pes_skill: 3, pes_letramento: 3, pes_dependencia: 3, pes_adocao: 3, ia_automacao: 3, ia_politica: 2, ia_dados: 2,
    log_otif_regra: 3, log_frete_conc: 2, log_entrega_real: 2, log_status: 3, log_cadastro: 2,
    est_acuracidade: 3, est_erp_wms: 3, est_negativo: 3, est_ruptura: 2, est_atualizacao: 3, cad_unidade: 3,
    fin_dre: 2, fin_rateio: 2, fin_fechamento: 2, fin_orcado: 1,
    op_prazo: 3, op_registro: 3, op_status: 3, op_ocorrencias: 2,
    com_fat_bate: 3, com_devolucao: 2, com_funil: 2, com_preco: 3, com_cliente_dup: 3,
    rh_headcount: 3, rh_indicadores: 2, rh_matricula: 3, rh_ponto: 3,
  };
  const assessB: Assessment = {
    id: "00000000-0000-4000-8000-0000000000b1", organization_id: ORG_B, title: "Assessment anual 2026", scope: "Operações + Financeiro", respondent: "Carlos (Ger. Operações)",
    status: "concluido",
    context: { segmento: "Logística / Transporte", porte: "201 a 500", sistemas: ["WMS próprio", "TMS", "Senior", "Power BI"], time_dados: "time", objetivo: "manual", dominios: ["comercial", "financeiro", "pessoas", "operacoes", "logistica", "estoque"], dores: "Faturas de frete com divergência; OTIF discutido com cada cliente.", versao: 3 },
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

  const q = "O que fazer nos próximos 30 dias?";
  const answer =
    "**Nomear um dono para o faturamento.** Hoje VTEX e Winthor divergem ~3% porque usam datas diferentes, e ninguém decide qual vale.\n\n1. Diretoria Comercial vira owner do KPI.\n2. Regra oficial: data da NF.\n3. Conciliação semanal pelo BI.";
  const threads: ChatThread[] = [
    {
      id: "00000000-0000-4000-8000-00000000c001", organization_id: ORG_A, title: q, created_at: daysAgo(1), updated_at: daysAgo(1),
      messages: [
        { id: "demo-q1", role: "user", content: q },
        { id: "demo-a1", role: "assistant", content: answer, priority_id: "00000000-0000-4000-8000-00000000d001" },
      ],
    },
  ];
  const priorities: Priority[] = [
    {
      id: "00000000-0000-4000-8000-00000000d001", organization_id: ORG_A, title: "Definir owner e regra oficial do faturamento",
      question: q, answer, status: "em_andamento", thread_id: threads[0].id, message_id: "demo-a1", created_at: daysAgo(1), updated_at: daysAgo(1),
    },
  ];

  return { organizations: orgs, assessments: [assessA, assessB], kpis, profiles, chat_threads: threads, priorities };
}
