# Plan del proyecto evalez MVP

**Estado:** implementación local en curso  
**Referencia de producto:** `evalez_SPEC_V3.0.txt`  
**Última actualización:** 27 de octubre de 2026

## Objetivo

Construir un MVP de evalez que permita a una empresa registrar un sitio web bajo su control, autorizar un análisis técnico y recibir un informe con evidencia. El sistema no debe realizar comprobaciones externas antes de que el host exacto esté verificado y autorizado.

## Etapa 1 · Base de producto

Completada localmente.

- Landing de referencia integrada en la ruta raíz.
- Aplicación con Next.js y TypeScript.
- Registro, inicio de sesión y sesión de usuario con Supabase.
- Creación de organización, sitios y hosts exactos.
- Esquema de datos inicial, control de acceso por organización y auditoría básica.

## Etapa 2 · Seguridad previa al análisis

Avanzada localmente.

- Perfil de red `STATIC-1` con límites de rastreo, duración y solicitudes.
- Bloqueo de métodos HTTP no permitidos, hosts ajenos, IP privadas y puertos no permitidos.
- Desafío DNS para demostrar control del host.
- Solicitud de autorización separada del control DNS.
- Compuerta que exige DNS verificado y autorización aprobada para `STATIC-1 v1`.
- Una ejecución solo puede programarse cuando se mantienen ambas condiciones.

## Etapa 3 · Worker y motor de análisis

Siguiente etapa.

- El worker aislado reclamará ejecuciones programadas de forma atómica.
- Antes de cada conexión validará el host, perfil, método, puerto, presupuesto y destino.
- Se implementarán primero las reglas P1: TLS/HTTPS, enlaces internos y directivas SEO `noindex`.
- Se guardarán ejecuciones de regla, evidencia y hallazgos en Supabase.
- Las pruebas locales actuales usan fixtures; no contactan hosts externos.

## Etapa 4 · Informe

- Historial de ejecuciones por sitio.
- Informe protegido con resultados, evidencia y cobertura del análisis.
- Recomendaciones explicadas en lenguaje claro.
- La IA, cuando se conecte, solo redactará explicaciones a partir de hallazgos técnicos existentes; no decidirá ni inventará resultados.

## Etapa 5 · Preparación para publicar

- Desplegar la aplicación web en Vercel.
- Configurar el dominio y DNS en Cloudflare.
- Desplegar el worker como servicio aislado, fuera de Vercel.
- Seleccionar proveedor de IA, correo, monitoreo, copias de seguridad y operación de incidentes.
- Validar región, tratamiento de datos, subprocesadores y contrato de datos antes de abrir el servicio a terceros.
- Ejecutar una prueba con un sitio web real cuya autorización esté documentada.

## Estado actual y siguiente resultado esperado

El MVP ya puede registrar el contexto de una empresa y proteger la programación de análisis. El próximo resultado es un worker capaz de tomar una ejecución `scheduled`, aplicar sus barreras de seguridad y procesar las reglas P1 sin salir del alcance autorizado.
