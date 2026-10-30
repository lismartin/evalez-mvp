begin;

select plan(13);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('f1030000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't03-owner-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('f1030000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't03-reader-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('f1030000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't03-owner-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

set local session_replication_role = replica;

insert into public.organizations (id, name) values
  ('00000000-0000-0000-0000-000000000101', 'Organizacion T03 A'),
  ('00000000-0000-0000-0000-000000000102', 'Organizacion T03 B');

set local session_replication_role = origin;

insert into public.organization_members (organization_id, user_id, role) values
  ('00000000-0000-0000-0000-000000000101', 'f1030000-0000-0000-0000-000000000001', 'owner'),
  ('00000000-0000-0000-0000-000000000101', 'f1030000-0000-0000-0000-000000000002', 'reader'),
  ('00000000-0000-0000-0000-000000000102', 'f1030000-0000-0000-0000-000000000003', 'owner');

insert into public.websites (id, organization_id, name) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Sitio T03 A'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 'Sitio T03 B');

insert into public.website_hosts (
  id, website_id, hostname, verification_status, authorization_status, authorization_profile
) values (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000202',
  'otra-organizacion.example.test',
  'verified',
  'authorized',
  'STATIC-1'
);

insert into public.analysis_runs (
  id, organization_id, website_id, website_host_id, profile_id, profile_version, status
) values (
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000301',
  'STATIC-1', '1', 'completed'
);

insert into public.rule_executions (
  id, analysis_run_id, rule_id, rule_version, execution_status, technical_result
) values (
  '00000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000401',
  'TLS-001', '1', 'successful', 'confirmed_finding'
);

insert into public.findings (
  id, organization_id, website_id, analysis_run_id, rule_execution_id,
  rule_id, fingerprint, priority, technical_result, title
) values (
  '00000000-0000-0000-0000-000000000601',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000501',
  'TLS-001', 't03-cross-tenant', 'high', 'confirmed_finding', 'Hallazgo ajeno'
);

insert into public.evidence (id, finding_id, evidence_type, payload) values (
  '00000000-0000-0000-0000-000000000701',
  '00000000-0000-0000-0000-000000000601',
  'tls_certificate', '{}'::jsonb
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'f1030000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  $$insert into public.website_hosts (
      website_id, hostname, verification_status, authorization_status, authorization_profile
    ) values (
      '00000000-0000-0000-0000-000000000201', 'ataque-host.example.test', 'verified', 'authorized', 'STATIC-1'
    )$$,
  '42501',
  'permission denied for table website_hosts',
  'un propietario no puede insertar un host ya verificado y autorizado'
);

select throws_ok(
  $$insert into public.analysis_authorization_requests (
      organization_id, website_host_id, profile_id, profile_version, status, requested_by,
      approved_at, authorization_text_version
    ) values (
      '00000000-0000-0000-0000-000000000101',
      (select id from public.website_hosts where hostname = 'ataque-host.example.test'),
      'STATIC-1', '1', 'approved', auth.uid(), now(), 'MVP-1'
    )$$,
  '42501',
  'permission denied for table analysis_authorization_requests',
  'un propietario no puede insertar una autorizacion aprobada'
);

select throws_ok(
  $$insert into public.host_verification_challenges (
      organization_id, website_host_id, method, record_name, token_value, status, requested_by, expires_at
    ) values (
      '00000000-0000-0000-0000-000000000101',
      (select id from public.website_hosts where hostname = 'ataque-host.example.test'),
      'dns_txt', '_evalez-verification.ataque-host.example.test', 'ataque', 'verified', auth.uid(), now() + interval '7 days'
    )$$,
  '42501',
  'permission denied for table host_verification_challenges',
  'un propietario no puede insertar un desafio verificado'
);

select throws_ok(
  $$select public.schedule_authorized_static1_run(
      '00000000-0000-0000-0000-000000000201',
      (select id from public.website_hosts where hostname = 'ataque-host.example.test')
    )$$,
  'P0001',
  'El host no tiene control y autorizacion STATIC-1 vigentes.',
  'un host manipulado no permite programar STATIC-1'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'f1030000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true
);

update public.websites
set intended_indexability = true
where id = '00000000-0000-0000-0000-000000000201';

select is(
  (select intended_indexability from public.websites where id = '00000000-0000-0000-0000-000000000201'),
  null,
  'un reader no puede cambiar la intencion de indexacion'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'f1030000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

select is((select count(*) from public.website_hosts where id = '00000000-0000-0000-0000-000000000301'), 0::bigint, 'A no lee hosts de B');
select is((select count(*) from public.analysis_runs where id = '00000000-0000-0000-0000-000000000401'), 0::bigint, 'A no lee ejecuciones de B');
select is((select count(*) from public.findings where id = '00000000-0000-0000-0000-000000000601'), 0::bigint, 'A no lee hallazgos de B');
select is((select count(*) from public.evidence where id = '00000000-0000-0000-0000-000000000701'), 0::bigint, 'A no lee evidencia de B');

select lives_ok(
  $$insert into public.websites (organization_id, name) values
    ('00000000-0000-0000-0000-000000000101', 'Sitio legitimo T03')$$,
  'el propietario puede crear un sitio'
);

select lives_ok(
  $$insert into public.website_hosts (website_id, hostname) values
    ((select id from public.websites where name = 'Sitio legitimo T03'), 'legitimo-t03.example.test')$$,
  'el propietario puede crear un host pendiente'
);

select lives_ok(
  $$insert into public.host_verification_challenges (
      organization_id, website_host_id, method, record_name, token_value, requested_by, expires_at
    ) values (
      '00000000-0000-0000-0000-000000000101',
      (select id from public.website_hosts where hostname = 'legitimo-t03.example.test'),
      'dns_txt', '_evalez-verification.legitimo-t03.example.test', 'legitimo', auth.uid(), now() + interval '7 days'
    )$$,
  'el propietario puede solicitar un desafio DNS pendiente'
);

select lives_ok(
  $$insert into public.analysis_authorization_requests (
      organization_id, website_host_id, profile_id, profile_version, requested_by, authorization_text_version
    ) values (
      '00000000-0000-0000-0000-000000000101',
      (select id from public.website_hosts where hostname = 'legitimo-t03.example.test'),
      'STATIC-1', '1', auth.uid(), 'MVP-1'
    )$$,
  'el propietario puede solicitar autorizacion pendiente'
);

select * from finish();

rollback;
