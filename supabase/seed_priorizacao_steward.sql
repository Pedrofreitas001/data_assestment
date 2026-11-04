-- =====================================================================
-- Dados de exemplo da Priorização e do Steward (Casa Aurora e Rota Sul).
-- Rode DEPOIS de seed_showcase.sql e da migration 0005.
-- Pode rodar de novo: atualiza os mesmos registros.
-- =====================================================================

-- Marketing entra no diagnóstico da Casa Aurora (se ainda não estiver)
update public.assessments
set context = jsonb_set(context, '{dominios}', coalesce(context->'dominios', '[]'::jsonb) || '["marketing"]'::jsonb)
where id = '10000000-0000-4000-8000-0000000000a1'
  and not coalesce(context->'dominios', '[]'::jsonb) @> '["marketing"]'::jsonb;

-- Priorização: Casa Aurora
insert into public.impact_maps (id, organization_id, areas, manual_order, justifications)
values (
  '10000000-0000-4000-8000-0000000a1001',
  '10000000-0000-4000-8000-00000000000a',
  '{
    "comercial": {"drivers": {"receita": 6, "descontos": 3, "equipe": {"p": 4, "c": 2}, "sistemas": 2}, "estrategia": 5, "patrocinador": "sim", "nota": "Diretoria quer margem por loja e por canal até o fim do trimestre."},
    "marketing": {"drivers": {"verba": 4, "receita_mkt": 5, "equipe": {"p": 2, "c": 3}, "sistemas": 2}, "estrategia": 4, "patrocinador": "informal"},
    "ecommerce": {"drivers": {"receita_online": 5, "midia_digital": 3, "equipe": {"p": 2, "c": 2}}, "estrategia": 4, "patrocinador": "sim"},
    "estoque": {"drivers": {"valor_estoque": 5, "ruptura": 3, "equipe": {"p": 3, "c": 1}}, "estrategia": 3, "patrocinador": "informal"},
    "financeiro": {"drivers": {"inadimplencia": 2, "juros": 1, "equipe": {"p": 2, "c": 3}}, "estrategia": 3, "patrocinador": "sim"}
  }'::jsonb,
  null,
  '{}'::jsonb
)
on conflict (organization_id) do update set areas = excluded.areas, manual_order = excluded.manual_order, justifications = excluded.justifications;

-- Priorização: Rota Sul
insert into public.impact_maps (id, organization_id, areas, manual_order, justifications)
values (
  '10000000-0000-4000-8000-0000000b1001',
  '10000000-0000-4000-8000-00000000000b',
  '{
    "logistica": {"drivers": {"frete": 6, "armazenagem": 5, "equipe": {"p": 6, "c": 2}, "sistemas": 3}, "estrategia": 5, "patrocinador": "sim", "nota": "Auditoria de frete e OTIF por transportadora são a meta do ano."},
    "operacoes": {"drivers": {"custo_operacao": 6, "retrabalho": 4, "equipe": {"p": 5, "c": 2}}, "estrategia": 4, "patrocinador": "sim"},
    "estoque": {"drivers": {"valor_estoque": 5, "ruptura": 2, "equipe": {"p": 4, "c": 2}}, "estrategia": 3, "patrocinador": "informal"},
    "comercial": {"drivers": {"receita": 7, "descontos": 4, "equipe": {"p": 4, "c": 3}}, "estrategia": 4, "patrocinador": "informal"},
    "financeiro": {"drivers": {"inadimplencia": 4, "juros": 3, "equipe": {"p": 3, "c": 3}}, "estrategia": 3, "patrocinador": "sim"},
    "pessoas": {"drivers": {"folha": 6, "desligamentos": 4}, "estrategia": 2}
  }'::jsonb,
  null,
  '{}'::jsonb
)
on conflict (organization_id) do update set areas = excluded.areas, manual_order = excluded.manual_order, justifications = excluded.justifications;

-- Steward: candidatos de exemplo
insert into public.steward_reviews (id, organization_id, name, role, area, answers, notes, chosen)
values
  ('10000000-0000-4000-8000-0000000a5001', '10000000-0000-4000-8000-00000000000a', 'Carla Mendes', 'Coordenadora comercial', 'Comercial',
   '{"neg_fluxo":4,"neg_indicadores":4,"dad_origem":2,"dad_excel":2,"dad_criterio":3,"tra_acesso":4,"tra_conduz":3,"tra_cobra":3,"tem_horas":3,"tem_patrocinio":3,"tem_organizacao":3}'::jsonb,
   'Conhece todas as lojas e conduz bem reunião; monta pouco relatório sozinha.', false),
  ('10000000-0000-4000-8000-0000000a5002', '10000000-0000-4000-8000-00000000000a', 'Tiago Ramos', 'Analista de BI', 'Controladoria',
   '{"neg_fluxo":2,"neg_indicadores":3,"dad_origem":4,"dad_excel":4,"dad_criterio":4,"tra_acesso":2,"tra_conduz":2,"tra_cobra":1,"tem_horas":2,"tem_patrocinio":2,"tem_organizacao":3}'::jsonb,
   'Mantém a planilha de-para VTEX x Winthor; pouco contato com as lojas.', false),
  ('10000000-0000-4000-8000-0000000b5001', '10000000-0000-4000-8000-00000000000b', 'Marcos Teixeira', 'Supervisor de operações', 'Operações',
   '{"neg_fluxo":4,"neg_indicadores":3,"dad_origem":3,"dad_excel":3,"dad_criterio":3,"tra_acesso":3,"tra_conduz":3,"tra_cobra":4,"tem_horas":3,"tem_patrocinio":4,"tem_organizacao":4}'::jsonb,
   'Conhece o fluxo de ponta a ponta e é ouvido pela diretoria; já cobra transportadoras por prazo.', true),
  ('10000000-0000-4000-8000-0000000b5002', '10000000-0000-4000-8000-00000000000b', 'Juliana Prado', 'Analista financeira', 'Financeiro',
   '{"neg_fluxo":2,"neg_indicadores":3,"dad_origem":3,"dad_excel":4,"dad_criterio":3,"tra_acesso":2,"tra_conduz":2,"tra_cobra":2,"tem_horas":1,"tem_patrocinio":2,"tem_organizacao":3}'::jsonb,
   'Boa com planilhas, mas tem menos de 1 hora por semana livre.', false)
on conflict (id) do update set name = excluded.name, role = excluded.role, area = excluded.area, answers = excluded.answers, notes = excluded.notes, chosen = excluded.chosen;

-- Conferência: deve mostrar 2 mapas e 4 avaliações
select (select count(*) from public.impact_maps) as mapas_de_impacto, (select count(*) from public.steward_reviews) as avaliacoes_steward;
