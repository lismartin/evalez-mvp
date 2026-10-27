import Link from "next/link";

export default function DocsPage() {
  return (
    <main className="docs-shell">
      <Link className="text-link" href="/">← Inicio</Link>
      <p className="eyebrow">Estado del prototipo</p>
      <h1>Base de interfaz del MVP</h1>
      <p>Esta aplicación inicia el flujo de usuario del MVP de forma local. La autenticación, base de datos, verificación DNS real, worker de análisis, cola e integración de IA siguen pendientes de conexión.</p>
      <p>La delimitación funcional y la infraestructura propuesta están en los documentos de planificación de la carpeta principal.</p>
    </main>
  );
}
