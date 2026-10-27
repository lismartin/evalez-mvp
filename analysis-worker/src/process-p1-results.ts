import type { RuleResult } from "../../src/lib/rules/p1.ts";

export type StoredRuleExecution = {
  ruleId: RuleResult["ruleId"];
  ruleVersion: "1";
  executionStatus: "successful" | "blocked" | "skipped";
  technicalResult: "confirmed_finding" | "no_anomaly" | "not_evaluable";
  details: { summary: string; observations: RuleResult["evidence"][] };
};

export type StoredFinding = {
  ruleId: RuleResult["ruleId"];
  fingerprint: string;
  priority: "high" | "medium";
  title: string;
  evidence: RuleResult["evidence"];
};

export type ProcessedP1Results = {
  ruleExecutions: StoredRuleExecution[];
  findings: StoredFinding[];
  coverage: { evaluated: number; blocked: number; notApplicable: number };
};

function priorityFor(ruleId: RuleResult["ruleId"]): StoredFinding["priority"] {
  return ruleId === "TLS-001" ? "high" : "medium";
}

function fingerprintFor(result: RuleResult): string {
  const evidence = Object.entries(result.evidence)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("|");
  return `${result.ruleId}:${evidence}`;
}

function outcomeRank(outcome: RuleResult["outcome"]) {
  if (outcome === "finding") return 4;
  if (outcome === "blocked") return 3;
  if (outcome === "passed") return 2;
  return 1;
}

function mapExecution(results: RuleResult[]): StoredRuleExecution {
  const result = [...results].sort((left, right) => outcomeRank(right.outcome) - outcomeRank(left.outcome))[0];
  if (!result) throw new Error("Una ejecución de regla debe contener al menos una observación.");
  const details = {
    summary: result.summary,
    observations: results.map((item) => item.evidence)
  };
  if (result.outcome === "finding") {
    return {
      ruleId: result.ruleId,
      ruleVersion: "1",
      executionStatus: "successful",
      technicalResult: "confirmed_finding",
      details
    };
  }
  if (result.outcome === "passed") {
    return {
      ruleId: result.ruleId,
      ruleVersion: "1",
      executionStatus: "successful",
      technicalResult: "no_anomaly",
      details
    };
  }
  return {
    ruleId: result.ruleId,
    ruleVersion: "1",
    executionStatus: result.outcome === "blocked" ? "blocked" : "skipped",
    technicalResult: "not_evaluable",
    details
  };
}

export function processP1Results(results: RuleResult[]): ProcessedP1Results {
  const grouped = new Map<RuleResult["ruleId"], RuleResult[]>();
  for (const result of results) grouped.set(result.ruleId, [...(grouped.get(result.ruleId) ?? []), result]);
  const ruleExecutions = [...grouped.values()].map(mapExecution);
  const findings = results
    .filter((result) => result.outcome === "finding")
    .map((result) => ({
      ruleId: result.ruleId,
      fingerprint: fingerprintFor(result),
      priority: priorityFor(result.ruleId),
      title: result.summary,
      evidence: result.evidence
    }));

  return {
    ruleExecutions,
    findings,
    coverage: {
      evaluated: results.filter((result) => result.outcome === "finding" || result.outcome === "passed").length,
      blocked: results.filter((result) => result.outcome === "blocked").length,
      notApplicable: results.filter((result) => result.outcome === "not_applicable").length
    }
  };
}
