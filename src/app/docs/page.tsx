import Link from "next/link";

export default function DocsPage() {
  return (
    <main className="docs-shell">
      <Link className="text-link" href="/">← Inicio</Link>
      <p className="eyebrow">Estado del MVP interno</p>
      <h1>Implementación local en curso</h1>
      <p>La aplicación ya incluye autenticación, organizaciones, sitios, un desafío DNS, solicitudes de autorización, reglas con fixtures e informes locales.</p>
      <p>La verificación DNS real, la aprobación interna, el worker que ejecuta STATIC-1 y el informe completo con cobertura siguen pendientes. No se analiza ningún host sin control y autorización vigentes.</p>
      <p>El desglose de tareas está en el plan del MVP, carpeta <code>evalez-mvp-plan</code>; pídelo al PM.</p>
    </main>
  );
}
