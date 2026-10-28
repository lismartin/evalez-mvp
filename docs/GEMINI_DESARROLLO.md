# Gemini para desarrollo local

Esta integración usa Gemini únicamente en desarrollo local y con datos de prueba. El endpoint devuelve `403` en producción.

## Configuración

1. Crea una clave en Google AI Studio.
2. En `.env.local`, añade `AI_API_KEY=...` y, opcionalmente, `AI_MODEL=gemini-3.5-flash-lite`.
3. Reinicia `pnpm dev`.

No compartas la clave por chat, no la subas a Git y no uses el nivel gratuito para informes reales de clientes. El endpoint solo envía a Gemini el hallazgo y su evidencia guardada; no le da acceso al sitio web ni permite que modifique resultados.
