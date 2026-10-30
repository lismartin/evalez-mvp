# Plan del proyecto evalez MVP

**Estado:** implementación local en curso  
**Referencia de producto:** SPEC 3.0 (solicitar al PM)
**Última actualización:** 30 de octubre de 2026

## Objetivo

Construir un MVP interno de evalez para que una organización registre un sitio bajo su control, obtenga autorización para un análisis técnico y consulte un informe con evidencia. Antes de cualquier comprobación externa, el host exacto debe mantener una prueba de control y una autorización vigente.

## Etapa 1 - Base de producto

Completada localmente.

- Landing local y aplicación con Next.js y TypeScript.
- Registro, inicio de sesión y sesiones con Supabase.
- Organizaciones, miembros, sitios y hosts exactos, aislados por organización.
- Esquema de datos, RLS y auditoría básica.

## Etapa 2 - Seguridad previa al análisis

En curso; no debe describirse como avanzada ni completa.

- Existe el perfil STATIC-1 con límites, política de métodos, hosts, puertos y destinos.
- Existe un desafío DNS y la solicitud de autorización separada.
- Falta verificar el TXT contra DNS real, proteger el token del desafío y permitir la revocación efectiva.
- Falta la aprobación interna de solicitudes y la aplicación completa de las transiciones de estado.
- La compuerta de autorización y las migraciones son una base; el análisis real no puede depender todavía de ellas como garantía final.

## Etapa 3 - Worker y motor de análisis

En curso por partes.

- Hay adaptadores de reserva, presupuesto, política de egreso, recolección de portada, procesamiento de reglas y persistencia.
- TLS-001, LINK-001 y SEO-001 tienen lógica y fixtures controlados.
- Falta un proceso ejecutable que revalide DNS y autorización antes de cada solicitud, haga el sondeo TLS y persista el resultado completo de forma atómica.
- Las pruebas actuales no autorizan tráfico hacia hosts reales.

## Etapa 4 - Informe

Base local disponible; recorrido real pendiente.

- Existen vistas de informe, evidencia y explicaciones deterministas.
- Gemini puede generar una explicación a demanda solo en desarrollo local, a partir de hallazgos y evidencia ya guardados.
- Falta que el informe se alimente exclusivamente de una instantánea real, muestre cobertura y comunique estados parciales, cancelados o fallidos sin prometer éxito.

## Etapa 5 - Aceptación interna

Pendiente.

- Preparar un sitio de prueba propio con TLS y errores controlados.
- Completar el recorrido local: DNS, autorización interna, análisis, informe, revocación y aislamiento entre organizaciones.
- No hay despliegue, piloto externo, facturación ni garantías comerciales dentro de este MVP.

El trabajo detallado está en el plan del MVP, carpeta `evalez-mvp-plan`, que se solicita al PM. Pendiente: documentos de alcance citados por el plan del 27-10 (pedidos al equipo).
