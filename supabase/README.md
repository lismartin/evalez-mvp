# Supabase para evalez MVP

Esta carpeta contiene el esquema inicial de desarrollo. No contiene datos de clientes, secretos ni migraciones de producción.

## Uso

1. Crea un proyecto de Supabase de desarrollo.
2. Ejecuta `schema.sql` desde el SQL Editor.
3. Copia las credenciales de proyecto a `../.env.local`; nunca las añadas a Git.
4. Completa la conexión de autenticación desde la aplicación cuando estén disponibles los paquetes oficiales.

## Alcance del esquema

El esquema modela las entidades iniciales que exige la SPEC: organizaciones, membresías, sitios, hosts y eventos de auditoría. Cada sitio pertenece a una organización y cada host se registra de forma separada. El control técnico del host y la autorización de análisis tienen estados distintos.

No crea todavía trabajos de análisis, reglas, hallazgos, informes ni evidencia. Esas entidades se añadirán junto al worker aislado para evitar que datos de demostración se confundan con ejecuciones reales.

## Migraciones para proyectos ya creados

Si ya ejecutaste `schema.sql`, aplica también cada archivo de `migrations/` en orden desde el SQL Editor. No vuelvas a ejecutar el esquema completo sobre el mismo proyecto.
