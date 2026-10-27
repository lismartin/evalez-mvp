-- evalez MVP: esquema inicial de Supabase/PostgreSQL.
-- Ejecutar solo en un proyecto de desarrollo nuevo y revisarlo antes de producción.

create extension if not exists pgcrypto;

create type public.organization_role as enum ('owner', 'admin', 'editor', 'reader');
create type public.host_verification_status as enum ('pending', 'verified', 'failed', 'revoked');
create type public.analysis_authorization_status as enum ('pending', 'authorized', 'revoked', 'expired');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'reader',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.websites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  intended_indexability boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.website_hosts (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  hostname text not null check (hostname = lower(hostname)),
  verification_status public.host_verification_status not null default 'pending',
  verification_method text check (verification_method in ('dns_txt', 'file', 'manual_phone', 'manual_email')),
  verification_checked_at timestamptz,
  authorization_status public.analysis_authorization_status not null default 'pending',
  authorization_profile text,
  authorization_granted_at timestamptz,
  authorization_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, hostname)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  subject_type text not null,
  subject_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index websites_organization_id_idx on public.websites (organization_id);
create index website_hosts_website_id_idx on public.website_hosts (website_id);
create index audit_events_organization_id_created_at_idx on public.audit_events (organization_id, created_at desc);

create function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id and user_id = auth.uid()
  );
$$;

create function public.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create function public.create_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, auth.uid(), 'owner');
  return new;
end;
$$;

create trigger organizations_create_owner
after insert on public.organizations
for each row execute function public.create_owner_membership();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.websites enable row level security;
alter table public.website_hosts enable row level security;
alter table public.audit_events enable row level security;

-- Permisos explícitos para Data API. No se conceden permisos a anon.
-- RLS sigue decidiendo qué filas puede ver o modificar cada usuario autenticado.
grant usage on schema public to authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, insert, update on public.websites to authenticated;
grant select, insert on public.website_hosts to authenticated;
grant select on public.audit_events to authenticated;

create policy "organization members can read organizations"
on public.organizations for select to authenticated
using (public.is_organization_member(id));

create policy "authenticated users can create organizations"
on public.organizations for insert to authenticated
with check (auth.uid() is not null);

create policy "owners can update organizations"
on public.organizations for update to authenticated
using (public.is_organization_owner(id))
with check (public.is_organization_owner(id));

create policy "members can read memberships"
on public.organization_members for select to authenticated
using (public.is_organization_member(organization_id));

create policy "members can read websites"
on public.websites for select to authenticated
using (public.is_organization_member(organization_id));

create policy "members can create websites"
on public.websites for insert to authenticated
with check (public.is_organization_member(organization_id));

create policy "members can update websites"
on public.websites for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create policy "members can read website hosts"
on public.website_hosts for select to authenticated
using (
  exists (
    select 1 from public.websites
    where websites.id = website_hosts.website_id
      and public.is_organization_member(websites.organization_id)
  )
);

create policy "members can create website hosts"
on public.website_hosts for insert to authenticated
with check (
  exists (
    select 1 from public.websites
    where websites.id = website_hosts.website_id
      and public.is_organization_member(websites.organization_id)
  )
);

create policy "members can read organization audit events"
on public.audit_events for select to authenticated
using (public.is_organization_member(organization_id));

create policy "members can create their own audit events"
on public.audit_events for insert to authenticated
with check (
  public.is_organization_member(organization_id)
  and actor_id = auth.uid()
);
