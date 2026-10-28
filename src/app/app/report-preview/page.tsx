import { redirect } from "next/navigation";
import { ReportViewer } from "@/components/report-viewer";
import styles from "@/components/workspace.module.css";
import { createClient } from "@/lib/supabase/server";

export default async function ReportPreviewPage() {
  if (process.env.NODE_ENV === "production") redirect("/app");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/login");

  const findings = [
    { id: "preview-seo", ruleId: "SEO-001", priority: "medium", title: "La página de servicios está bloqueada para buscadores.", state: "open", evidence: { type: "rule_observation", payload: { page_path: "/servicios", declared_indexable: true, effective_noindex: true } } },
    { id: "preview-link", ruleId: "LINK-001", priority: "medium", title: "El enlace de contacto no lleva a una página válida.", state: "open", evidence: { type: "rule_observation", payload: { source_path: "/", target_path: "/contacto-anterior", target_status: 404 } } }
  ];
  const coverage = { evaluated: 3, blocked: 0, notApplicable: 0 };

  return (
    <main className={styles.detailShell}>
      <section className={styles.reportFrame}>
        <header className={styles.reportHeader}>
          <div><h1>Esto merece tu atención.</h1><p>3 reglas evaluadas · Datos controlados · Informe de ejemplo</p></div>
          <div className={styles.reportStamp}>Hallazgos de ejemplo<br />explicados con claridad</div>
        </header>
        <ReportViewer findings={findings} status="completed" coverage={coverage} preview />
      </section>
    </main>
  );
}
