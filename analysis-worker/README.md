# Worker aislado de análisis

Este paquete no es todavía un escáner. Define las barreras que debe cumplir el futuro proceso separado de análisis antes de realizar conexiones de red.

## Incluye

- Contrato de trabajo: host autorizado, perfil y límites explícitos.
- Política de destino: rechaza IP literales, localhost y redes privadas o reservadas en la prevalidación.
- Presupuesto `STATIC-1`: páginas, solicitudes, concurrencia, tiempo de espera y duración total.
- Compuerta de autorización: exige control verificado y autorización aprobada para el mismo perfil y versión.
- Salida HTTP controlada: permite únicamente GET, HEAD y OPTIONS sobre hosts autorizados, con puertos 80/443 y tiempo de espera STATIC-1.
- Tests de seguridad sin conexiones externas.
- Adaptador para reservar de forma atómica una ejecución `STATIC-1` desde Supabase.
- Conversión de resultados P1 a ejecuciones de regla, hallazgos y evidencia preparada para persistirse.
- Recolector de portada HTML que solo usa la salida HTTP controlada y no sigue destinos externos.
- Conexión de las observaciones de portada con `SEO-001` y `LINK-001`, con una ejecución por regla y evidencia por enlace.
- Plan de persistencia y adaptador de escritura para ejecuciones, hallazgos, evidencia e informe en Supabase.
- Orquestador STATIC-1: reserva, recolección, reglas y persistencia conectadas mediante adaptadores controlados.

## No incluye todavía

- Un consumidor que procese reglas, resolución DNS, HTTP/TLS, rastreo o despliegue.
- Una conexión a `demo.ejemplo.test` ni a ningún otro host.

## Reserva de ejecuciones

La migración `20261027_add_worker_reservation.sql` deja que únicamente el rol de servidor de Supabase reserve una ejecución `scheduled`. El futuro consumidor usará `SUPABASE_URL` y `SUPABASE_SECRET_KEY` como secretos del entorno del worker; nunca deben exponerse al navegador ni añadirse a Git.

El adaptador está preparado, pero no existe aún un comando que lo ejecute: reservar una ejecución la marca como `running`, por lo que solo debe activarse cuando el consumidor pueda completar o fallar una ejecución de forma fiable. La siguiente pieza será un recolector HTTP/DNS/TLS que alimente resultados reales, sin exceder las barreras existentes.

El escritor de resultados usa exclusivamente las credenciales privadas del worker. No se ejecuta mediante pruebas locales ni debe recibir la clave secreta desde el navegador.

Ejecuta las pruebas con `pnpm --dir analysis-worker test:safety`.
