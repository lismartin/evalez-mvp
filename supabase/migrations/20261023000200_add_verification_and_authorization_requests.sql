-- Ejecutar una sola vez después de las migraciones anteriores.
-- Prepara solicitudes pendientes; no confirma DNS ni aprueba análisis automáticamente.

create type public.verification_challenge_status as enum ('pending', 'verified', 'failed', 'expired', 'revoked');
create type public.authorization_request_status as enum ('pending', 'approved', 'rejected', 'revoked');

create table public.host_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_host_id uuid not null references public.website_hosts(id) on delete cascade,
  method text not null check (method in ('dns_txt')),
  record_name text not null,
  token_value text not null,
  status public.verification_challenge_status not null default 'pending',
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  checked_at timestamptz,
  evidence jsonb not null default '{}'::jsonb
);

create table public.analysis_authorization_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_host_id uuid not null references public.website_hosts(id) on delete cascade,
  profile_id text not null,
  profile_version text not null,
  status public.authorization_request_status not null default 'pending',
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  authorization_text_version text not null,
  reviewer_note text
);

create unique index one_pending_dns_challenge_per_host
on public.host_verification_challenges (website_host_id)
where status = 'pending';

create unique index one_pending_authorization_per_host_profile
on public.analysis_authorization_requests (website_host_id, profile_id, profile_version)
where status = 'pending';

alter table public.host_verification_challenges enable row level security;
alter table public.analysis_authorization_requests enable row level security;

grant select, insert on public.host_verification_challenges to authenticated;
grant select, insert on public.analysis_authorization_requests to authenticated;

create policy "members can read host verification challenges"
on public.host_verification_challenges for select to authenticated
using (public.is_organization_member(organization_id));

create policy "owners can request host verification"
on public.host_verification_challenges for insert to authenticated
with check (
  public.is_organization_owner(organization_id)
  and requested_by = auth.uid()
);

create policy "members can read analysis authorization requests"
on public.analysis_authorization_requests for select to authenticated
using (public.is_organization_member(organization_id));

create policy "owners can request analysis authorization"
on public.analysis_authorization_requests for insert to authenticated
with check (
  public.is_organization_owner(organization_id)
  and requested_by = auth.uid()
);
