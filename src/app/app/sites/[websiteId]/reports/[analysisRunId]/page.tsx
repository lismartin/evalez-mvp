import { notFound, redirect } from "next/navigation";
import styles from "@/components/workspace.module.css";
import { ReportViewer } from "@/components/report-viewer";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ websiteId: string; analysisRunId: string }> };

function dateLabel(value: string | null) {
  if (!value) return "En curso";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function ReportPage({ params }: PageProps) {
  const { websiteId, analysisRunId } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", userId).maybeSingle();
  if (!membership) redirect("/onboarding");

  const { data: website } = await supabase.from("websites").select("id, name").eq("id", websiteId).eq("organization_id", membership.organization_id).maybeSingle();
  if (!website) notFound();

  const { data: run } = await supabase
    .from("analysis_runs")
    .select("id, profile_id, profile_version, status, coverage, created_at, completed_at")
    .eq("id", analysisRunId)
    .eq("website_id", website.id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (!run) notFound();

  const { data: findingRows } = await supabase.from("findings").select("id, rule_id, priority, title, state").eq("analysis_run_id", run.id).order("created_at", { ascending: true });
  const findings = findingRows ?? [];
  const findingIds = findings.map((finding) => finding.id);
  const { data: evidenceRows } = findingIds.length
    ? await supabase.from("evidence").select("finding_id, evidence_type, payload").in("finding_id", findingIds)
    : { data: [] };
  const evidenceByFinding = new Map((evidenceRows ?? []).map((evidence) => [evidence.finding_id, evidence]));

  const coverage = (run.coverage ?? {}) as { evaluated?: number; blocked?: number; notApplicable?: number };
  const isDemo = run.profile_id === "DEMO-LOCAL";
  const viewerFindings = findings.map((finding) => {
    const evidence = evidenceByFinding.get(finding.id);
    return {
      id: finding.id,
      ruleId: finding.rule_id,
      priority: finding.priority,
      title: finding.title,
      state: finding.state,
      evidence: evidence ? { type: evidence.evidence_type, payload: evidence.payload } : undefined
    };
  });

  return (
    <main className={styles.detailShell}>
      <section className={styles.reportFrame}>
        <header className={styles.reportHeader}>
          <div><h1>{findings.length ? "Esto merece tu atención." : "Tu informe está listo."}</h1><p>{coverage.evaluated ?? 0} reglas evaluadas · {dateLabel(run.completed_at ?? run.created_at)} · {run.profile_id} v{run.profile_version}{isDemo ? " · Datos de prueba" : ""}</p></div>
          <div className={styles.reportStamp}>Hallazgos técnicos<br />explicados con claridad</div>
        </header>
        <ReportViewer findings={viewerFindings} status={run.status} coverage={coverage} analysisRunId={run.id} />
      </section>
    </main>
  );
}
