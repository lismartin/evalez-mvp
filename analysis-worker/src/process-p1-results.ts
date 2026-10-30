import { createHash } from "node:crypto";
import type { RuleResult } from "../../src/lib/rules/p1.ts";

export type PlannedP1Context = {
  organizationId: string;
  websiteId: string;
  host: string;
  plannedRuleIds: readonly RuleResult["ruleId"][];
};

export type StoredRuleExecution = {
  ruleId: RuleResult["ruleId"];
  ruleVersion: "1";
  executionStatus: "successful" | "failed" | "blocked" | "skipped";
  technicalResult: "confirmed_finding" | "no_anomaly" | "not_evaluable";
  details: { summary: string; observations: RuleResult["evidence"][] };
};

export type StoredFinding = {
  ruleId: RuleResult["ruleId"];
  fingerprint: string;
  priority: "high" | "medium";
  findingType: RuleResult["findingType"];
  severity: RuleResult["severity"];
  customerPriority: RuleResult["customerPriority"];
  detectionConfidence: RuleResult["detectionConfidence"];
  title: string;
  evidence: Record<string, string | number | boolean | string[]>;
};

export type ProcessedP1Results = {
  ruleExecutions: StoredRuleExecution[];
  findings: StoredFinding[];
  coverage: { planned: number; successful: number; blockedOrFailed: number; skipped: number };
};

function fingerprintFor(result: RuleResult, context: PlannedP1Context): string {
  return createHash("sha256").update(`${context.organizationId}|${context.websiteId}|${result.ruleId}|${context.host}|${result.causeKey}`).digest("hex");
}

function rank(outcome: RuleResult["outcome"]): number {
  return outcome === "failed" ? 6 : outcome === "blocked" ? 5 : outcome === "finding" ? 4 : outcome === "passed" ? 3 : 1;
}

function mapExecution(ruleId: RuleResult["ruleId"], observations: RuleResult[]): StoredRuleExecution {
  if (observations.length === 0) return { ruleId, ruleVersion: "1", executionStatus: "skipped", technicalResult: "not_evaluable", details: { summary: "La regla planificada no recibio observaciones.", observations: [] } };
  const selected = [...observations].sort((a, b) => rank(b.outcome) - rank(a.outcome))[0];
  const executionStatus = selected.outcome === "finding" || selected.outcome === "passed" ? "successful" : selected.outcome === "failed" ? "failed" : selected.outcome === "blocked" ? "blocked" : "skipped";
  return { ruleId, ruleVersion: "1", executionStatus, technicalResult: selected.outcome === "finding" ? "confirmed_finding" : selected.outcome === "passed" ? "no_anomaly" : "not_evaluable", details: { summary: selected.summary, observations: observations.map((item) => item.evidence) } };
}

export function processP1Results(results: RuleResult[], context?: PlannedP1Context): ProcessedP1Results {
  const effectiveContext = context ?? { organizationId: "unknown", websiteId: "unknown", host: "unknown", plannedRuleIds: [...new Set(results.map((item) => item.ruleId))] };
  const grouped = new Map<RuleResult["ruleId"], RuleResult[]>();
  for (const result of results) grouped.set(result.ruleId, [...(grouped.get(result.ruleId) ?? []), result]);
  const ruleExecutions = effectiveContext.plannedRuleIds.map((ruleId) => mapExecution(ruleId, grouped.get(ruleId) ?? []));
  const findingGroups = new Map<string, RuleResult[]>();
  for (const finding of results.filter((item) => item.outcome === "finding")) {
    const key = `${finding.ruleId}|${finding.causeKey}`;
    findingGroups.set(key, [...(findingGroups.get(key) ?? []), finding]);
  }
  const findings = [...findingGroups.values()].map((group) => {
    const first = group[0];
    const sources = [...new Set(group.map((item) => item.evidence.source_path).filter((value): value is string => typeof value === "string"))];
    const priority: StoredFinding["priority"] = first.severity === "high" || first.severity === "critical" ? "high" : "medium";
    return { ruleId: first.ruleId, fingerprint: fingerprintFor(first, effectiveContext), priority, findingType: first.findingType, severity: first.severity, customerPriority: first.customerPriority, detectionConfidence: first.detectionConfidence, title: first.summary, evidence: { ...first.evidence, ...(sources.length > 0 ? { source_paths: sources } : {}) } };
  });
  return { ruleExecutions, findings, coverage: { planned: effectiveContext.plannedRuleIds.length, successful: ruleExecutions.filter((item) => item.executionStatus === "successful").length, blockedOrFailed: ruleExecutions.filter((item) => item.executionStatus === "blocked" || item.executionStatus === "failed").length, skipped: ruleExecutions.filter((item) => item.executionStatus === "skipped").length } };
}
