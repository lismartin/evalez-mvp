# evalez MVP local

Aplicación inicial en TypeScript y Next.js para convertir el recorrido de producto de evalez en una interfaz mantenible.

## Estado actual

La ruta `/` sirve la landing V3 local aprobada, conservada en `public/landing-v3/index.html`. Su fuente original está en `../landing/v3.template.html` y debe actualizarse allí antes de copiar una nueva versión.

La ruta `/app` implementa el recorrido de demostración: registrar un host, simular la autorización DNS, seleccionar las tres reglas iniciales y consultar un informe de muestra. No realiza autenticación, verificación DNS, análisis de red, persistencia ni llamadas de IA reales.

Los resultados se identifican como datos de demostración. No deben presentarse como análisis de una web.

La base de integración con Supabase está preparada en `supabase/schema.sql` y `.env.example`, pero aún no hay credenciales ni un proyecto externo conectado. El esquema crea las entidades iniciales de organización, miembros, sitios y hosts, con aislamiento por organización mediante RLS.

## Ejecutar localmente

1. Instala Node.js LTS. El proyecto usa pnpm 11.1.1 mediante Corepack.
2. Activa pnpm una sola vez: `corepack enable`.
3. En esta carpeta, ejecuta `pnpm install`. Esto creará `pnpm-lock.yaml`; no uses npm ni generes `package-lock.json`.
4. Ejecuta `pnpm dev`.
5. Abre la dirección local indicada por Next.js.

## Conectar Supabase

1. Crear un proyecto de Supabase para desarrollo.
2. Ejecutar `supabase/schema.sql` en el SQL Editor del proyecto.
3. Copiar `.env.example` como `.env.local` y completar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. La clave secreta se deja vacía hasta que exista un worker o ruta de servidor que realmente la necesite.
4. Instalar las dependencias desde una red con acceso a npm: `pnpm add @supabase/ssr @supabase/supabase-js`.
5. Implementar la autenticación y las rutas protegidas. No uses la clave de servicio en componentes del navegador.

En Supabase, configura en **Auth > URL Configuration** la URL del sitio como `http://localhost:3000` y añade `http://localhost:3000/auth/confirm` como URL de redirección. Antes de desplegar en Vercel, añade también la URL de producción equivalente.

## Siguientes módulos

1. Conectar Supabase: autenticación, organizaciones y rutas protegidas.
2. Autorización DNS real, revocación y auditoría.
3. Cola y worker aislado con salida de red controlada.
4. Reglas TLS-001, LINK-001 y SEO-001 con pruebas.
5. Informe persistente e integración de IA con salida estructurada.

## Reglas controladas

Las primeras reglas P1 se implementan primero como funciones puras, sin solicitudes de red. Sus fixtures controlados se ejecutan con `pnpm test:rules`. El worker aislado conectará estas reglas a observaciones reales solo después de implementar la autorización y los límites de red.

## Worker separado

`analysis-worker/` contiene el contrato y las barreras iniciales del worker de análisis. Sus pruebas se ejecutan con `pnpm test:worker-safety`; no se conectan a la red ni a Supabase. La cola y el proveedor donde se ejecutará el worker siguen pendientes de elección.

Las decisiones de alcance e infraestructura se encuentran en `../planning/`.
