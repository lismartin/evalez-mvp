begin;
select plan(19);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
('f1040000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t04-owner@example.test','',now(),'{}','{}',now(),now()),
('f1040000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t04-reviewer-2@example.test','',now(),'{}','{}',now(),now());
set local session_replication_role = replica;
insert into public.organizations (id, name) values ('f1040000-0000-0000-0000-000000000101','Organizacion T04');
set local session_replication_role = origin;
insert into public.organization_members (organization_id,user_id,role) values ('f1040000-0000-0000-0000-000000000101','f1040000-0000-0000-0000-000000000011','owner');
insert into public.websites (id,organization_id,name) values ('f1040000-0000-0000-0000-000000000201','f1040000-0000-0000-0000-000000000101','Sitio T04');
insert into public.website_hosts (id,website_id,hostname) values ('f1040000-0000-0000-0000-000000000301','f1040000-0000-0000-0000-000000000201','t04.example.test');
insert into public.host_verification_challenges (id,organization_id,website_host_id,method,record_name,token_value,requested_by,expires_at) values ('f1040000-0000-0000-0000-000000000401','f1040000-0000-0000-0000-000000000101','f1040000-0000-0000-0000-000000000301','dns_txt','_evalez.t04.example.test','test','f1040000-0000-0000-0000-000000000011',now()+interval '1 day');
insert into public.host_verification_challenges (id,organization_id,website_host_id,method,record_name,token_value,requested_by,expires_at,status) values ('f1040000-0000-0000-0000-000000000402','f1040000-0000-0000-0000-000000000101','f1040000-0000-0000-0000-000000000301','dns_txt','_evalez-expired.t04.example.test','expired','f1040000-0000-0000-0000-000000000011',now()-interval '1 day','expired');
insert into public.internal_staff (user_id,role) values ('f1040000-0000-0000-0000-000000000012','reviewer');

set local role service_role;
select lives_ok($$select public.record_dns_verification('f1040000-0000-0000-0000-000000000401',true,'{"resolver":"test"}'::jsonb)$$,'service role registra DNS encontrado');
select is((select verification_status from public.website_hosts where id='f1040000-0000-0000-0000-000000000301'),'verified'::public.host_verification_status,'DNS verifica el host');
select is((select count(*) from public.audit_events where subject_id='f1040000-0000-0000-0000-000000000401'),1::bigint,'DNS escribe un evento');
select throws_ok($$select public.record_dns_verification('f1040000-0000-0000-0000-000000000402',true,'{}'::jsonb)$$,'P0001','El desafio DNS ya no esta pendiente.','un desafio vencido no se verifica');
select throws_ok($$select public.approve_analysis_authorization('f1040000-0000-0000-0000-000000000999','x')$$,'P0001','Solo el personal revisor puede aprobar autorizaciones.','service role no aprueba solicitudes');

reset role;
insert into public.analysis_authorization_requests (id,organization_id,website_host_id,profile_id,profile_version,requested_by,authorization_text_version) values ('f1040000-0000-0000-0000-000000000501','f1040000-0000-0000-0000-000000000101','f1040000-0000-0000-0000-000000000301','STATIC-1','1','f1040000-0000-0000-0000-000000000011','MVP-1');
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub','f1040000-0000-0000-0000-000000000012','role','authenticated')::text,true);
select lives_ok($$select public.approve_analysis_authorization('f1040000-0000-0000-0000-000000000501','revisado')$$,'revisor externo aprueba');
reset role;
select is((select authorization_status from public.website_hosts where id='f1040000-0000-0000-0000-000000000301'),'authorized'::public.analysis_authorization_status,'aprobar autoriza el host');
select is((select count(*) from public.audit_events where subject_id='f1040000-0000-0000-0000-000000000501'),1::bigint,'aprobar escribe un evento');
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub','f1040000-0000-0000-0000-000000000012','role','authenticated')::text,true);
select throws_ok($$select public.approve_analysis_authorization('f1040000-0000-0000-0000-000000000501','otra')$$,'P0001','La solicitud de autorizacion ya no esta pendiente.','no se aprueba dos veces');

reset role;
insert into public.analysis_authorization_requests (id,organization_id,website_host_id,profile_id,profile_version,requested_by,authorization_text_version) values ('f1040000-0000-0000-0000-000000000502','f1040000-0000-0000-0000-000000000101','f1040000-0000-0000-0000-000000000301','STATIC-1','2','f1040000-0000-0000-0000-000000000011','MVP-1');
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub','f1040000-0000-0000-0000-000000000012','role','authenticated')::text,true);
select lives_ok($$select public.reject_analysis_authorization('f1040000-0000-0000-0000-000000000502','alcance no acreditado')$$,'revisor externo rechaza');
reset role;
select is((select status from public.analysis_authorization_requests where id='f1040000-0000-0000-0000-000000000502'),'rejected'::public.authorization_request_status,'rechazar cambia la solicitud');
select is((select count(*) from public.audit_events where subject_id='f1040000-0000-0000-0000-000000000502'),1::bigint,'rechazar escribe un evento');
insert into public.organization_members (organization_id,user_id,role) values ('f1040000-0000-0000-0000-000000000101','f1040000-0000-0000-0000-000000000012','reader');
insert into public.analysis_authorization_requests (id,organization_id,website_host_id,profile_id,profile_version,requested_by,authorization_text_version) values ('f1040000-0000-0000-0000-000000000503','f1040000-0000-0000-0000-000000000101','f1040000-0000-0000-0000-000000000301','STATIC-1','3','f1040000-0000-0000-0000-000000000011','MVP-1');
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub','f1040000-0000-0000-0000-000000000012','role','authenticated')::text,true);
select throws_ok($$select public.approve_analysis_authorization('f1040000-0000-0000-0000-000000000503','conflicto')$$,'P0001','Un revisor no puede aprobar una solicitud de su propia organizacion.','un revisor de la organizacion no aprueba');

reset role;
insert into public.analysis_runs (id,organization_id,website_id,website_host_id,profile_id,profile_version,status) values ('f1040000-0000-0000-0000-000000000601','f1040000-0000-0000-0000-000000000101','f1040000-0000-0000-0000-000000000201','f1040000-0000-0000-0000-000000000301','STATIC-1','1','running');
insert into public.analysis_runs (id,organization_id,website_id,website_host_id,profile_id,profile_version,status) values ('f1040000-0000-0000-0000-000000000602','f1040000-0000-0000-0000-000000000101','f1040000-0000-0000-0000-000000000201','f1040000-0000-0000-0000-000000000301','STATIC-1','2','scheduled');
set local role service_role;
select ok(public.is_run_authorized('f1040000-0000-0000-0000-000000000601'),'ejecucion en curso autorizada');
reset role;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub','f1040000-0000-0000-0000-000000000011','role','authenticated')::text,true);
select lives_ok($$select public.revoke_analysis_authorization('f1040000-0000-0000-0000-000000000301','orden del propietario')$$,'propietario revoca');
reset role;
select is((select authorization_status from public.website_hosts where id='f1040000-0000-0000-0000-000000000301'),'revoked'::public.analysis_authorization_status,'revocar cambia el host');
select ok((select cancellation_requested_at is not null from public.analysis_runs where id='f1040000-0000-0000-0000-000000000601'),'revocar pide cancelar ejecucion');
select is((select status from public.analysis_runs where id='f1040000-0000-0000-0000-000000000602'),'cancelled'::public.analysis_run_status,'revocar cancela la ejecucion programada');
set local role service_role;
select ok(not public.is_run_authorized('f1040000-0000-0000-0000-000000000601'),'revocar invalida la ejecucion');
select * from finish();
rollback;
