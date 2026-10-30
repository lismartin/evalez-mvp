-- Cierra C1: el cliente solo puede crear solicitudes pendientes y nunca
-- escribir estados de verificacion o autorizacion.

revoke insert, update, delete on public.website_hosts from authenticated;
grant insert (website_id, hostname) on public.website_hosts to authenticated;

drop policy "members can create website hosts" on public.website_hosts;
create policy "members can create pending website hosts"
on public.website_hosts for insert to authenticated
with check (
  verification_status = 'pending'
  and authorization_status = 'pending'
  and verification_method is null
  and authorization_profile is null
  and exists (
    select 1 from public.websites
    where websites.id = website_hosts.website_id
      and public.is_organization_member(websites.organization_id)
  )
);

revoke insert, update, delete on public.host_verification_challenges from authenticated;
grant insert (organization_id, website_host_id, method, record_name, token_value, requested_by, expires_at)
on public.host_verification_challenges to authenticated;

drop policy "owners can request host verification" on public.host_verification_challenges;
create policy "owners can request pending host verification"
on public.host_verification_challenges for insert to authenticated
with check (
  status = 'pending'
  and public.is_organization_owner(organization_id)
  and requested_by = auth.uid()
);

revoke insert, update, delete on public.analysis_authorization_requests from authenticated;
grant insert (organization_id, website_host_id, profile_id, profile_version, requested_by, authorization_text_version)
on public.analysis_authorization_requests to authenticated;

drop policy "owners can request analysis authorization" on public.analysis_authorization_requests;
create policy "owners can request pending analysis authorization"
on public.analysis_authorization_requests for insert to authenticated
with check (
  status = 'pending'
  and approved_by is null
  and approved_at is null
  and reviewer_note is null
  and public.is_organization_owner(organization_id)
  and requested_by = auth.uid()
);

drop policy "members can update websites" on public.websites;
create policy "owners can update websites"
on public.websites for update to authenticated
using (public.is_organization_owner(organization_id))
with check (public.is_organization_owner(organization_id));
