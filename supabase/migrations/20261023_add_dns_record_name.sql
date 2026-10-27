-- Ejecutar una sola vez después de crear host_verification_challenges.
-- Añade el nombre explícito del registro TXT para desafíos ya existentes.

alter table public.host_verification_challenges add column record_name text;

update public.host_verification_challenges as challenge
set record_name = '_evalez-verification.' || host.hostname
from public.website_hosts as host
where host.id = challenge.website_host_id
  and challenge.record_name is null;

alter table public.host_verification_challenges alter column record_name set not null;
