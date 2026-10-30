import type { ProcessedP1Results } from "./process-p1-results.ts";

export type PersistedRunContext = {
  analysisRunId: string;
  organizationId: string;
  websiteId: string;
};

export type P1PersistencePlan = {
  ruleExecutions: Array<{
    analysis_run_id: string;
    rule_id: string;
    rule_version: string;
    execution_status: string;
    technical_result: string;
    observed_at: string;
    details: Record<string, unknown>;
  }>;
  findings: ProcessedP1Results["findings"];
  snapshot: {
    organization_id: string;
    website_id: string;
    analysis_run_id: string;
    snapshot: Record<string, unknown>;
  };
  finalStatus: "completed" | "partially_completed";
};

export function buildP1PersistencePlan(
  context: PersistedRunContext,
  processed: ProcessedP1Results,
  observedAt: string
): P1PersistencePlan {
  const finalStatus = processed.coverage.blockedOrFailed > 0 || processed.coverage.skipped > 0 ? "partially_completed" : "completed";
  return {
    ruleExecutions: processed.ruleExecutions.map((execution) => ({
      analysis_run_id: context.analysisRunId,
      rule_id: execution.ruleId,
      rule_version: execution.ruleVersion,
      execution_status: execution.executionStatus,
      technical_result: execution.technicalResult,
      observed_at: observedAt,
      details: execution.details
    })),
    findings: processed.findings,
    snapshot: {
      organization_id: context.organizationId,
      website_id: context.websiteId,
      analysis_run_id: context.analysisRunId,
      snapshot: {
        coverage: processed.coverage,
        finding_count: processed.findings.length,
        rule_execution_count: processed.ruleExecutions.length,
        generated_at: observedAt
      }
    },
    finalStatus
  };
}
