import { createClient } from "@supabase/supabase-js";
import type { ProcessedP1Results } from "./process-p1-results.ts";
import { buildP1PersistencePlan, type PersistedRunContext } from "./persistence-plan.ts";
import type { WorkerDatabaseConfig } from "./scheduled-run-reservation.ts";

function writerClient(config: WorkerDatabaseConfig) {
  return createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function persistP1Results(
  config: WorkerDatabaseConfig,
  context: PersistedRunContext,
  processed: ProcessedP1Results,
  observedAt: string
) {
  const supabase = writerClient(config);
  const plan = buildP1PersistencePlan(context, processed, observedAt);

  const { data: activeRun, error: activeRunError } = await supabase
    .from("analysis_runs")
    .select("id")
    .eq("id", context.analysisRunId)
    .eq("organization_id", context.organizationId)
    .eq("website_id", context.websiteId)
    .eq("status", "running")
    .maybeSingle();
  if (activeRunError || !activeRun) throw new Error("La ejecución no está activa o no pertenece al contexto esperado.");

  const executionIds = new Map<string, string>();
  for (const execution of plan.ruleExecutions) {
    const { data, error } = await supabase
      .from("rule_executions")
      .upsert(execution, { onConflict: "analysis_run_id,rule_id,rule_version" })
      .select("id, rule_id")
      .single();
    if (error || !data) throw new Error(`No se pudo guardar ${execution.rule_id}: ${error?.message ?? "sin respuesta"}`);
    executionIds.set(data.rule_id, data.id);
  }

  for (const finding of plan.findings) {
    const ruleExecutionId = executionIds.get(finding.ruleId);
    if (!ruleExecutionId) throw new Error(`No existe ejecución persistida para ${finding.ruleId}.`);
    const { data, error } = await supabase
      .from("findings")
      .upsert({
        organization_id: context.organizationId,
        website_id: context.websiteId,
        analysis_run_id: context.analysisRunId,
        rule_execution_id: ruleExecutionId,
        rule_id: finding.ruleId,
        fingerprint: finding.fingerprint,
        priority: finding.priority,
        technical_result: "confirmed_finding",
        title: finding.title
      }, { onConflict: "analysis_run_id,fingerprint" })
      .select("id")
      .single();
    if (error || !data) throw new Error(`No se pudo guardar el hallazgo ${finding.ruleId}: ${error?.message ?? "sin respuesta"}`);

    const { error: evidenceError } = await supabase.from("evidence").insert({
      finding_id: data.id,
      evidence_type: "rule_observation",
      payload: finding.evidence,
      redacted: true
    });
    if (evidenceError) throw new Error(`No se pudo guardar evidencia para ${finding.ruleId}: ${evidenceError.message}`);
  }

  const { error: snapshotError } = await supabase
    .from("report_snapshots")
    .upsert(plan.snapshot, { onConflict: "analysis_run_id" });
  if (snapshotError) throw new Error(`No se pudo guardar el informe: ${snapshotError.message}`);

  const { error: completionError } = await supabase
    .from("analysis_runs")
    .update({ status: plan.finalStatus, completed_at: observedAt, coverage: processed.coverage })
    .eq("id", context.analysisRunId)
    .eq("status", "running");
  if (completionError) throw new Error(`No se pudo cerrar la ejecución: ${completionError.message}`);

  return plan.finalStatus;
}
