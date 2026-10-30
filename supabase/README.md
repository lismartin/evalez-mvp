# Supabase remoto para evalez MVP

La estructura de datos se versiona en `migrations/` y se aplica al proyecto
remoto de desarrollo autorizado. `seed.sql` agrega dos cuentas, organizaciones,
sitios y hosts de prueba con correos `.test`; no contiene secretos ni datos de
clientes.

## Requisitos

- Node 22 o superior y Corepack.
- Un token de Supabase limitado al proyecto de desarrollo.
- La URL de conexión **Session pooler** en `SUPABASE_DB_URL`. No la guardes en
  Git ni la pegues en conversaciones: incluye la contraseña de Postgres.

## Flujo remoto

Desde la raíz del repositorio, usando la URL de sesión IPv4 de Supabase:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm exec supabase db push --db-url $env:SUPABASE_DB_URL --dry-run
corepack pnpm exec supabase db push --db-url $env:SUPABASE_DB_URL --include-seed
```

La vista previa debe revisarse antes de cada aplicación. `--include-seed` añade
los datos de prueba; no borra los existentes. Para proyectos de desarrollo
vacíos, un reinicio remoto (`db reset --db-url`) es destructivo y requiere una
confirmación humana separada.

`supabase test db` utiliza Docker o Podman incluso si recibe `--db-url` remoto.
En máquinas sin runtime de contenedores, usa las comprobaciones de esquema del
job de CI y ejecuta pgTAP en un runner que sí tenga Docker.

## Proyecto remoto creado antes del historial de migraciones

Si el esquema ya existe pero `supabase_migrations.schema_migrations` está vacío,
no ejecutes `db push` directamente. Primero verifica que las tablas, tipos,
políticas y funciones coincidan con el código. Después, una persona responsable
puede registrar las versiones existentes con `supabase migration repair --status
applied ...`; la migración `20261029000100_t02_reconcile_legacy_remote_schema`
completa de forma no destructiva `record_name` y la función de programación
faltantes. No se ejecuta esta reparación automáticamente.
