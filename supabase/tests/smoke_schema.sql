begin;

select plan(22);

select has_table('public', 'organizations', 'existe organizations');
select has_table('public', 'organization_members', 'existe organization_members');
select has_table('public', 'websites', 'existe websites');
select has_table('public', 'website_hosts', 'existe website_hosts');
select has_table('public', 'audit_events', 'existe audit_events');
select has_table('public', 'analysis_runs', 'existe analysis_runs');
select has_table('public', 'rule_executions', 'existe rule_executions');
select has_table('public', 'findings', 'existe findings');
select has_table('public', 'evidence', 'existe evidence');
select has_table('public', 'report_snapshots', 'existe report_snapshots');

select has_column('public', 'host_verification_challenges', 'record_name', 'host_verification_challenges tiene record_name');
select has_function('public', 'schedule_authorized_static1_run', array['uuid', 'uuid'], 'existe schedule_authorized_static1_run(uuid, uuid)');

select is((select relrowsecurity from pg_class where oid = 'public.organizations'::regclass), true, 'RLS activo en organizations');
select is((select relrowsecurity from pg_class where oid = 'public.organization_members'::regclass), true, 'RLS activo en organization_members');
select is((select relrowsecurity from pg_class where oid = 'public.websites'::regclass), true, 'RLS activo en websites');
select is((select relrowsecurity from pg_class where oid = 'public.website_hosts'::regclass), true, 'RLS activo en website_hosts');
select is((select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass), true, 'RLS activo en audit_events');
select is((select relrowsecurity from pg_class where oid = 'public.analysis_runs'::regclass), true, 'RLS activo en analysis_runs');
select is((select relrowsecurity from pg_class where oid = 'public.rule_executions'::regclass), true, 'RLS activo en rule_executions');
select is((select relrowsecurity from pg_class where oid = 'public.findings'::regclass), true, 'RLS activo en findings');
select is((select relrowsecurity from pg_class where oid = 'public.evidence'::regclass), true, 'RLS activo en evidence');
select is((select relrowsecurity from pg_class where oid = 'public.report_snapshots'::regclass), true, 'RLS activo en report_snapshots');

select * from finish();

rollback;
