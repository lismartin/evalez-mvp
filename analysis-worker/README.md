# Worker aislado de análisis

Este paquete no es todavía un escáner. Define las barreras que debe cumplir el futuro proceso separado de análisis antes de realizar conexiones de red.

## Incluye

- Contrato de trabajo: host autorizado, perfil y límites explícitos.
- Política de destino: rechaza IP literales, localhost y redes privadas o reservadas en la prevalidación.
- Presupuesto `STATIC-1`: páginas, solicitudes, concurrencia, tiempo de espera y duración total.
- Compuerta de autorización: exige control verificado y autorización aprobada para el mismo perfil y versión.
- Salida HTTP controlada: permite únicamente GET, HEAD y OPTIONS sobre hosts autorizados, con puertos 80/443 y tiempo de espera STATIC-1.
- Tests de seguridad sin conexiones externas.

## No incluye todavía

- Cola real, credenciales de Supabase, resolución DNS, HTTP/TLS, rastreo ni despliegue.
- Una conexión a `demo.ejemplo.test` ni a ningún otro host.

Ejecuta las pruebas con `pnpm --dir analysis-worker test:safety`.
