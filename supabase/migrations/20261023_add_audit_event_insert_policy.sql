-- Ejecutar una sola vez en proyectos que ya ejecutaron supabase/schema.sql
-- Permite que una acción autenticada registre eventos de su propia organización.

create policy "members can create their own audit events"
on public.audit_events for insert to authenticated
with check (
  public.is_organization_member(organization_id)
  and actor_id = auth.uid()
);
