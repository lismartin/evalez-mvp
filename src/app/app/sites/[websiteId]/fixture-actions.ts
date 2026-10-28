"use server";

import { redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { enqueueLocalFixtureJob } from "@/lib/local-fixture-queue";
import { buildLocalDemoReport } from "@/lib/demo-report";
import { createClient } from "@/lib/supabase/server";

export async function enqueueFixtureRun(formData: FormData) {
  if (process.env.NODE_ENV === "production") redirect("/app");

  const websiteId = String(formData.get("websiteId") ?? "");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("id", websiteId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (!website) redirect("/app");

  await enqueueLocalFixtureJob(website.id, membership.organization_id);
  redirect(`/app/sites/${website.id}?fixture=queued`);
}

export async function seedLocalDemoReport(formData: FormData) {
  if (process.env.NODE_ENV === "production") redirect("/app");
  const websiteId = String(formData.get("websiteId") ?? "");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: membership } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", userId).maybeSingle();
  if (!membership || membership.role !== "owner") redirect(`/app/sites/${websiteId}?demo=forbidden`);
  const { data: website } = await supabase.from("websites").select("id, website_hosts (id)").eq("id", websiteId).eq("organization_id", membership.organization_id).maybeSingle();
  const host = website?.website_hosts?.[0];
  if (!website || !host) redirect(`/app/sites/${websiteId}?demo=no-host`);

  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) redirect(`/app/sites/${websiteId}?demo=missing-secret`);
  const admin = createSupabaseAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const observedAt = new Date().toISOString();
  const demo = buildLocalDemoReport({ organizationId: membership.organization_id, websiteId: website.id, websiteHostId: host.id, userId, observedAt });

  const fail = (stage: string, error?: { message?: string } | null): never => {
    console.error(`[evalez demo report] ${stage}`, error?.message ?? "sin detalle");
    redirect(`/app/sites/${websiteId}?demo=error&demoStage=${stage}`);
  };

  const { data: run, error: runError } = await admin.from("analysis_runs").insert(demo.run).select("id").single();
  if (runError || !run) { fail("ejecucion", runError); throw new Error("Redirección de error no completada."); }

  const { data: executions, error: executionError } = await admin.from("rule_executions").insert(demo.ruleExecutions.map((item) => ({ ...item, analysis_run_id: run.id, observed_at: observedAt }))).select("id, rule_id");
  if (executionError || !executions) { fail("reglas", executionError); throw new Error("Redirección de error no completada."); }
  const executionIds = new Map(executions.map((execution) => [execution.rule_id, execution.id]));

  for (const finding of demo.findings) {
    const { data: savedFinding, error: findingError } = await admin.from("findings").insert({
      organization_id: membership.organization_id, website_id: website.id, analysis_run_id: run.id,
      rule_execution_id: executionIds.get(finding.ruleId), rule_id: finding.ruleId, fingerprint: finding.fingerprint,
      priority: finding.priority, technical_result: "confirmed_finding", title: finding.title
    }).select("id").single();
    if (findingError || !savedFinding) { fail("hallazgos", findingError); throw new Error("Redirección de error no completada."); }
    const { error: evidenceError } = await admin.from("evidence").insert({ finding_id: savedFinding.id, evidence_type: "demo_fixture", payload: finding.evidence, redacted: true });
    if (evidenceError) { fail("evidencia", evidenceError); throw new Error("Redirección de error no completada."); }
  }

  const { error: snapshotError } = await admin.from("report_snapshots").insert({
    organization_id: membership.organization_id, website_id: website.id, analysis_run_id: run.id,
    snapshot: { source: "local_demo_fixture", coverage: demo.run.coverage, finding_count: demo.findings.length, generated_at: observedAt }
  });
  if (snapshotError) { fail("informe", snapshotError); throw new Error("Redirección de error no completada."); }

  await admin.from("audit_events").insert({ organization_id: membership.organization_id, actor_id: userId, event_type: "local_demo_report_created", subject_type: "analysis_run", subject_id: run.id, details: { website_id: website.id, source: "local_demo_fixture" } });
  redirect(`/app/sites/${websiteId}?demo=created`);
}
