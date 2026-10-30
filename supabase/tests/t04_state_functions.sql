begin;

select plan(2);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'f1040000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 't04-reviewer@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.internal_staff (user_id, role)
values ('f1040000-0000-0000-0000-000000000001', 'reviewer');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'f1040000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

select ok(public.is_internal_reviewer(), 'un revisor interno es reconocido por la funcion');

select throws_ok(
  $$select * from public.internal_staff$$,
  '42501',
  'permission denied for table internal_staff',
  'un usuario autenticado no puede leer el registro de personal interno'
);

select * from finish();

rollback;
