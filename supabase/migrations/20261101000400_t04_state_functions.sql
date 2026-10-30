-- Centraliza las transiciones de control, autorizacion y ejecucion.

create table public.internal_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'reviewer'),
  created_at timestamptz not null default now()
);

alter table public.internal_staff enable row level security;

create function public.is_internal_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.internal_staff
    where user_id = auth.uid() and role = 'reviewer'
  );
$$;

create function public.record_dns_verification(
  p_challenge_id uuid,
  p_found boolean,
  p_evidence jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge public.host_verification_challenges%rowtype;
  v_organization_id uuid;
begin
  select * into v_challenge
  from public.host_verification_challenges
  where id = p_challenge_id
  for update;

  if not found then
    raise exception 'El desafio DNS no existe.';
  end if;

  if v_challenge.status <> 'pending' then
    raise exception 'El desafio DNS ya no esta pendiente.';
  end if;

  if v_challenge.expires_at <= now() then
    raise exception 'El desafio DNS ha vencido.';
  end if;

  update public.host_verification_challenges
  set checked_at = now(), evidence = coalesce(p_evidence, '{}'::jsonb),
      status = case when p_found then 'verified'::public.verification_challenge_status else status end
  where id = v_challenge.id;

  if p_found then
    update public.website_hosts
    set verification_status = 'verified', verification_method = 'dns_txt', verification_checked_at = now()
    where id = v_challenge.website_host_id;
  end if;

  select organization_id into v_organization_id
  from public.websites
  where id = (select website_id from public.website_hosts where id = v_challenge.website_host_id);

  insert into public.audit_events (organization_id, actor_id, event_type, subject_type, subject_id, details)
  values (
    v_organization_id, auth.uid(),
    case when p_found then 'dns_verification_recorded' else 'dns_verification_not_found' end,
    'host_verification_challenge', v_challenge.id,
    jsonb_build_object('website_host_id', v_challenge.website_host_id, 'found', p_found)
  );
end;
$$;

create function public.approve_analysis_authorization(p_request_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.analysis_authorization_requests%rowtype;
begin
  if not public.is_internal_reviewer() then
    raise exception 'Solo el personal revisor puede aprobar autorizaciones.';
  end if;
  if nullif(trim(p_note), '') is null then
    raise exception 'La nota del revisor es obligatoria.';
  end if;

  select * into v_request
  from public.analysis_authorization_requests
  where id = p_request_id
  for update;
  if not found then
    raise exception 'La solicitud de autorizacion no existe.';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'La solicitud de autorizacion ya no esta pendiente.';
  end if;
  if public.is_organization_member(v_request.organization_id) then
    raise exception 'Un revisor no puede aprobar una solicitud de su propia organizacion.';
  end if;
  if not exists (
    select 1 from public.website_hosts
    where id = v_request.website_host_id and verification_status = 'verified'
  ) then
    raise exception 'El host debe estar verificado antes de aprobar la autorizacion.';
  end if;

  update public.analysis_authorization_requests
  set status = 'approved', approved_by = auth.uid(), approved_at = now(), reviewer_note = trim(p_note)
  where id = v_request.id;
  update public.website_hosts
  set authorization_status = 'authorized', authorization_profile = v_request.profile_id,
      authorization_granted_at = now(), authorization_revoked_at = null
  where id = v_request.website_host_id;
  insert into public.audit_events (organization_id, actor_id, event_type, subject_type, subject_id, details)
  values (v_request.organization_id, auth.uid(), 'analysis_authorization_approved',
    'analysis_authorization_request', v_request.id,
    jsonb_build_object('website_host_id', v_request.website_host_id, 'profile_id', v_request.profile_id, 'profile_version', v_request.profile_version));
end;
$$;

create function public.reject_analysis_authorization(p_request_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.analysis_authorization_requests%rowtype;
begin
  if not public.is_internal_reviewer() then
    raise exception 'Solo el personal revisor puede rechazar autorizaciones.';
  end if;
  if nullif(trim(p_note), '') is null then
    raise exception 'La nota del revisor es obligatoria.';
  end if;
  select * into v_request from public.analysis_authorization_requests where id = p_request_id for update;
  if not found then raise exception 'La solicitud de autorizacion no existe.'; end if;
  if v_request.status <> 'pending' then raise exception 'La solicitud de autorizacion ya no esta pendiente.'; end if;
  if public.is_organization_member(v_request.organization_id) then
    raise exception 'Un revisor no puede rechazar una solicitud de su propia organizacion.';
  end if;
  update public.analysis_authorization_requests
  set status = 'rejected', approved_by = auth.uid(), approved_at = now(), reviewer_note = trim(p_note)
  where id = v_request.id;
  insert into public.audit_events (organization_id, actor_id, event_type, subject_type, subject_id, details)
  values (v_request.organization_id, auth.uid(), 'analysis_authorization_rejected',
    'analysis_authorization_request', v_request.id, jsonb_build_object('website_host_id', v_request.website_host_id));
end;
$$;

create function public.revoke_analysis_authorization(p_website_host_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  select websites.organization_id into v_organization_id
  from public.website_hosts join public.websites on websites.id = website_hosts.website_id
  where website_hosts.id = p_website_host_id
  for update of website_hosts;
  if v_organization_id is null then raise exception 'El host no existe.'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'El motivo de la revocacion es obligatorio.'; end if;
  if not public.is_internal_reviewer() and not public.is_organization_owner(v_organization_id) then
    raise exception 'Solo el propietario o un revisor puede revocar la autorizacion.';
  end if;
  update public.analysis_authorization_requests
  set status = 'revoked', reviewer_note = trim(p_reason)
  where website_host_id = p_website_host_id and status = 'approved';
  update public.website_hosts
  set authorization_status = 'revoked', authorization_revoked_at = now()
  where id = p_website_host_id;
  update public.analysis_runs
  set cancellation_requested_at = now(), status = case when status = 'scheduled' then 'cancelled'::public.analysis_run_status else status end
  where website_host_id = p_website_host_id and status in ('scheduled', 'running');
  insert into public.audit_events (organization_id, actor_id, event_type, subject_type, subject_id, details)
  values (v_organization_id, auth.uid(), 'analysis_authorization_revoked', 'website_host', p_website_host_id,
    jsonb_build_object('reason', trim(p_reason)));
end;
$$;

create function public.is_run_authorized(p_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.analysis_runs run
    join public.website_hosts host on host.id = run.website_host_id
    join public.analysis_authorization_requests request on request.website_host_id = host.id
    where run.id = p_run_id
      and run.status = 'running'
      and run.cancellation_requested_at is null
      and run.profile_id = 'STATIC-1'
      and run.profile_version = '1'
      and host.verification_status = 'verified'
      and host.authorization_status = 'authorized'
      and host.authorization_profile = 'STATIC-1'
      and request.profile_id = 'STATIC-1'
      and request.profile_version = '1'
      and request.status = 'approved'
      and request.approved_at is not null
  );
$$;

revoke all on table public.internal_staff from public, authenticated;
revoke all on function public.is_internal_reviewer() from public;
revoke all on function public.record_dns_verification(uuid, boolean, jsonb) from public;
revoke all on function public.approve_analysis_authorization(uuid, text) from public;
revoke all on function public.reject_analysis_authorization(uuid, text) from public;
revoke all on function public.revoke_analysis_authorization(uuid, text) from public;
revoke all on function public.is_run_authorized(uuid) from public;

grant execute on function public.is_internal_reviewer() to authenticated;
grant execute on function public.approve_analysis_authorization(uuid, text) to authenticated;
grant execute on function public.reject_analysis_authorization(uuid, text) to authenticated;
grant execute on function public.revoke_analysis_authorization(uuid, text) to authenticated;
grant execute on function public.record_dns_verification(uuid, boolean, jsonb) to service_role;
grant execute on function public.is_run_authorized(uuid) to service_role;
