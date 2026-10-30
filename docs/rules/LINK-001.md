# LINK-001 - Enlace interno roto

- Entrada: enlace de HTML comprobado al host autorizado, dentro del presupuesto y permitido por robots.
- Disparador: destino con estado HTTP 404 o 410.
- Clasificacion: `confirmed_problem`, gravedad `low`, prioridad `later`, confianza `high`.
- Exclusiones: destino no autorizado es `blocked`; 5xx, timeout o error de transporte son `failed`.
- Evidencia: paginas de origen, destino normalizado y estado observado.
- Correccion: destino alcanzable o enlace eliminado desde una pagina de origen comprobada por completo.
- Huella: destino normalizado; varias paginas de origen para el mismo destino forman un hallazgo.
