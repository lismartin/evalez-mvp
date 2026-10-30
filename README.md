# evalez MVP local

Aplicación local de evalez para el MVP interno STATIC-1. Permite que una organización registre un sitio propio, prepare el control del host y consulte los resultados técnicos que estén disponibles para su organización.

## Estado actual

| Bloque | Estado |
| --- | --- |
| Autenticación | Registro, inicio de sesión, confirmación y cierre de sesión con Supabase. |
| Organizaciones y sitios | Una persona autenticada puede crear su organización, registrar sitios y hosts exactos, con aislamiento por organización. |
| Desafío DNS | Se crea y muestra un desafío TXT para el host. La comprobación DNS real sigue pendiente. |
| Autorización de análisis | Se puede solicitar autorización para STATIC-1; falta la aprobación real por personal interno. |
| Worker | Hay contratos, reserva, límites, política de destino, recolector de portada y piezas de persistencia. Aún no existe el comando que ejecute un análisis real completo. |
| Reglas | Hay implementaciones y fixtures para TLS-001, LINK-001 y SEO-001; la conexión completa de las reglas a un análisis autorizado sigue pendiente. |
| Informe | Hay informes locales y vistas de resultados persistidos; la cobertura y el estado final todavía no representan el recorrido STATIC-1 completo. |
| Gemini | En desarrollo local y a demanda, genera explicaciones solo a partir del hallazgo y su evidencia. T21 lo dejará activo por defecto para informes reales. |

No se debe presentar esta aplicación como un escáner público ni analizar hosts ajenos. Un análisis real del MVP exigirá una prueba DNS vigente y una autorización aprobada antes de cualquier tráfico.

## Pendiente para el MVP

- Comprobación DNS real, token protegido y revocación del control.
- Aprobación interna de la autorización STATIC-1 y aplicación de sus transiciones de estado.
- Worker ejecutable que revalide la autorización y el DNS, haga conexiones con egreso seguro y cierre siempre cada ejecución.
- Persistencia atómica, cobertura e informe honesto de los resultados reales.
- Sitio propio de prueba y recorrido de aceptación local.

El desglose de estas tareas está fuera de este repositorio en el plan del MVP, carpeta `evalez-mvp-plan`; pídelo al PM. Pendiente: documentos de alcance citados por el plan del 27-10 (pedidos al equipo).

## Ejecutar localmente

1. Instala Node.js 22 o superior y habilita Corepack: `corepack enable`.
2. Instala las dependencias bloqueadas: `corepack pnpm install --frozen-lockfile`.
3. Copia `.env.example` a `.env.local` y completa las variables públicas de Supabase para tu entorno local.
4. Inicia la aplicación: `corepack pnpm dev`.
5. Abre la dirección local que indique Next.js.

La clave `SUPABASE_SECRET_KEY` pertenece únicamente a rutas de servidor y al futuro worker: nunca la añadas al navegador ni a Git. Para probar Gemini en desarrollo local, define `AI_API_KEY` en `.env.local`; si falta, la aplicación mantiene su explicación determinista.

## Pruebas y comprobaciones

```sh
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
```

También hay comprobaciones por área, por ejemplo `corepack pnpm test:rules`, `corepack pnpm test:dns`, `corepack pnpm test:authorization` y `corepack pnpm test:worker-safety`. Consulta `package.json` para la lista completa.

## Límites conocidos

- El entorno es local; no hay despliegue ni servicio externo publicado.
- Las pruebas con fixtures no equivalen a comprobar un host real.
- La documentación final del recorrido interno se completará cuando exista la aceptación de punta a punta.
