-- Ejecutar en el proyecto de desarrollo después de las migraciones del modelo de análisis.
-- La clave secreta de Supabase actúa como service_role: omite RLS, pero necesita
-- permisos explícitos de tabla para que el worker y las Server Actions escriban.
-- No concede permisos adicionales a anon ni authenticated.

grant usage on schema public to service_role;

grant select, insert, update on public.analysis_runs to service_role;
grant select, insert, update on public.rule_executions to service_role;
grant select, insert, update on public.findings to service_role;
grant insert on public.evidence to service_role;
grant select, insert, update on public.report_snapshots to service_role;
grant insert on public.audit_events to service_role;
