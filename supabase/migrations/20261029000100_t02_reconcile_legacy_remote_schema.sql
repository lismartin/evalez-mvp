-- Reconciliación no destructiva para proyectos remotos creados antes de que
-- las migraciones se versionaran. La línea limpia ya contiene estos objetos.

alter table public.host_verification_challenges
  add column if not exists record_name text;

update public.host_verification_challenges as challenge
set record_name = '_evalez-verification.' || host.hostname
from public.website_hosts as host
where host.id = challenge.website_host_id
  and challenge.record_name is null;

alter table public.host_verification_challenges
  alter column record_name set not null;

create unique index if not exists one_active_analysis_run_per_host_profile
on public.analysis_runs (website_host_id, profile_id, profile_version)
where status in ('scheduled', 'running');

create or replace function public.schedule_authorized_static1_run(
  p_website_id uuid,
  p_website_host_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_run_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion autenticada.';
  end if;

  select organization_id into v_organization_id
  from public.websites
  where id = p_website_id;

  if v_organization_id is null or not public.is_organization_owner(v_organization_id) then
    raise exception 'Solo el propietario de la organizacion puede programar un analisis.';
  end if;

  if not exists (
    select 1 from public.website_hosts
    where id = p_website_host_id
      and website_id = p_website_id
      and verification_status = 'verified'
      and authorization_status = 'authorized'
      and authorization_profile = 'STATIC-1'
  ) then
    raise exception 'El host no tiene control y autorizacion STATIC-1 vigentes.';
  end if;

  if not exists (
    select 1 from public.analysis_authorization_requests
    where website_host_id = p_website_host_id
      and profile_id = 'STATIC-1'
      and profile_version = '1'
      and status = 'approved'
      and approved_at is not null
  ) then
    raise exception 'No existe una autorizacion aprobada para STATIC-1 v1.';
  end if;

  insert into public.analysis_runs (
    organization_id, website_id, website_host_id, profile_id, profile_version, status, requested_by
  ) values (
    v_organization_id, p_website_id, p_website_host_id, 'STATIC-1', '1', 'scheduled', auth.uid()
  ) returning id into v_run_id;

  insert into public.audit_events (
    organization_id, actor_id, event_type, subject_type, subject_id, details
  ) values (
    v_organization_id, auth.uid(), 'analysis_scheduled', 'analysis_run', v_run_id,
    jsonb_build_object(
      'website_id', p_website_id,
      'website_host_id', p_website_host_id,
      'profile_id', 'STATIC-1',
      'profile_version', '1'
    )
  );

  return v_run_id;
end;
$$;

revoke all on function public.schedule_authorized_static1_run(uuid, uuid) from public;
grant execute on function public.schedule_authorized_static1_run(uuid, uuid) to authenticated;
