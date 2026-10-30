-- Datos exclusivamente locales para las pruebas manuales del MVP.
-- Las cuentas usan correos .test y no incluyen credenciales reutilizables.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-one@example.test', crypt('local-test-only', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'owner-two@example.test', crypt('local-test-only', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
insert into public.organizations (id, name) values ('10000000-0000-0000-0000-000000000001', 'Organización local uno');
insert into public.websites (id, organization_id, name, intended_indexability) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Sitio local uno', true);
insert into public.website_hosts (id, website_id, hostname) values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'site-one.example.test');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', false);
insert into public.organizations (id, name) values ('10000000-0000-0000-0000-000000000002', 'Organización local dos');
insert into public.websites (id, organization_id, name, intended_indexability) values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Sitio local dos', false);
insert into public.website_hosts (id, website_id, hostname) values ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'site-two.example.test');
