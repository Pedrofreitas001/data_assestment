-- Anotações do relatório redigidas com o assistente (idempotente).
alter table public.assessments add column if not exists report_notes jsonb not null default '[]'::jsonb;
