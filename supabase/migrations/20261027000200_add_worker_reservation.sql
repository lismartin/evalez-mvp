-- Ejecutar despues de 20261027_add_authorized_analysis_scheduling.sql.
-- El worker, usando exclusivamente la clave secreta de servidor, reclama una
-- ejecucion programada de forma atomica. Vuelve a comprobar la autorizacion.

create or replace function public.reserve_next_static1_run()
returns table (
  id uuid,
  organization_id uuid,
  website_id uuid,
  website_host_id uuid,
  profile_id text,
  profile_version text,
  requested_by uuid,
  scheduled_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidate as (
    select analysis_runs.id
    from public.analysis_runs
    join public.website_hosts on website_hosts.id = analysis_runs.website_host_id
    where analysis_runs.status = 'scheduled'
      and analysis_runs.profile_id = 'STATIC-1'
      and analysis_runs.profile_version = '1'
      and website_hosts.verification_status = 'verified'
      and website_hosts.authorization_status = 'authorized'
      and website_hosts.authorization_profile = 'STATIC-1'
      and exists (
        select 1
        from public.analysis_authorization_requests
        where analysis_authorization_requests.website_host_id = analysis_runs.website_host_id
          and analysis_authorization_requests.profile_id = 'STATIC-1'
          and analysis_authorization_requests.profile_version = '1'
          and analysis_authorization_requests.status = 'approved'
          and analysis_authorization_requests.approved_at is not null
      )
    order by analysis_runs.scheduled_at asc
    for update of analysis_runs skip locked
    limit 1
  )
  update public.analysis_runs
  set status = 'running', started_at = now()
  from candidate
  where analysis_runs.id = candidate.id
  returning
    analysis_runs.id,
    analysis_runs.organization_id,
    analysis_runs.website_id,
    analysis_runs.website_host_id,
    analysis_runs.profile_id,
    analysis_runs.profile_version,
    analysis_runs.requested_by,
    analysis_runs.scheduled_at;
end;
$$;

revoke all on function public.reserve_next_static1_run() from public;
grant execute on function public.reserve_next_static1_run() to service_role;
