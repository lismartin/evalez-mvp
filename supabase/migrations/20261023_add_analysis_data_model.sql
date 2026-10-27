-- Ejecutar una sola vez después del esquema inicial y sus migraciones anteriores.
-- Prepara el modelo de análisis; no inicia análisis ni concede acceso de escritura al navegador.

create type public.analysis_run_status as enum ('scheduled', 'running', 'completed', 'partially_completed', 'cancelled', 'failed');
create type public.rule_execution_status as enum ('successful', 'failed', 'blocked', 'skipped', 'unsupported');
create type public.technical_result as enum ('confirmed_finding', 'recommendation', 'review_note', 'no_anomaly', 'not_evaluable');

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete restrict,
  website_host_id uuid not null references public.website_hosts(id) on delete restrict,
  profile_id text not null,
  profile_version text not null,
  status public.analysis_run_status not null default 'scheduled',
  requested_by uuid references auth.users(id) on delete set null,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancellation_requested_at timestamptz,
  coverage jsonb not null default '{}'::jsonb,
  failure_reason text,
  created_at timestamptz not null default now()
);

create table public.rule_executions (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  rule_id text not null,
  rule_version text not null,
  execution_status public.rule_execution_status not null,
  technical_result public.technical_result,
  observed_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (analysis_run_id, rule_id, rule_version)
);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete restrict,
  analysis_run_id uuid not null references public.analysis_runs(id) on delete restrict,
  rule_execution_id uuid not null references public.rule_executions(id) on delete restrict,
  rule_id text not null,
  fingerprint text not null,
  priority text not null,
  technical_result public.technical_result not null,
  title text not null,
  state text not null default 'open',
  created_at timestamptz not null default now(),
  unique (analysis_run_id, fingerprint)
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.findings(id) on delete cascade,
  evidence_type text not null,
  payload jsonb not null default '{}'::jsonb,
  redacted boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete restrict,
  analysis_run_id uuid not null references public.analysis_runs(id) on delete restrict,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (analysis_run_id)
);

create index analysis_runs_host_created_at_idx on public.analysis_runs (website_host_id, created_at desc);
create index rule_executions_analysis_run_id_idx on public.rule_executions (analysis_run_id);
create index findings_organization_id_created_at_idx on public.findings (organization_id, created_at desc);
create index evidence_finding_id_idx on public.evidence (finding_id);

alter table public.analysis_runs enable row level security;
alter table public.rule_executions enable row level security;
alter table public.findings enable row level security;
alter table public.evidence enable row level security;
alter table public.report_snapshots enable row level security;

grant select on public.analysis_runs, public.rule_executions, public.findings, public.evidence, public.report_snapshots to authenticated;

create policy "members can read analysis runs"
on public.analysis_runs for select to authenticated
using (public.is_organization_member(organization_id));

create policy "members can read rule executions through analysis runs"
on public.rule_executions for select to authenticated
using (
  exists (
    select 1 from public.analysis_runs
    where analysis_runs.id = rule_executions.analysis_run_id
      and public.is_organization_member(analysis_runs.organization_id)
  )
);

create policy "members can read findings"
on public.findings for select to authenticated
using (public.is_organization_member(organization_id));

create policy "members can read evidence through findings"
on public.evidence for select to authenticated
using (
  exists (
    select 1 from public.findings
    where findings.id = evidence.finding_id
      and public.is_organization_member(findings.organization_id)
  )
);

create policy "members can read report snapshots"
on public.report_snapshots for select to authenticated
using (public.is_organization_member(organization_id));
