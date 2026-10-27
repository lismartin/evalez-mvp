import assert from "node:assert/strict";
import { evaluateLink001, evaluateSeo001 } from "../../src/lib/rules/p1.ts";
import { processP1Results } from "./process-p1-results.ts";
import { buildP1PersistencePlan } from "./persistence-plan.ts";

const processed = processP1Results([
  evaluateLink001({ sourcePath: "/", targetPath: "/archivo", targetStatus: 404, targetIsAuthorizedInternal: true }),
  evaluateSeo001({ declaredIndexable: true, effectiveNoindex: null, pagePath: "/" })
]);
const plan = buildP1PersistencePlan(
  { analysisRunId: "run-1", organizationId: "org-1", websiteId: "site-1" },
  processed,
  "2026-10-27T15:00:00.000Z"
);
const actual = {
  ruleExecutions: plan.ruleExecutions.length,
  findings: plan.findings.length,
  finalStatus: plan.finalStatus,
  snapshotRun: plan.snapshot.analysis_run_id
};
const expected = { ruleExecutions: 2, findings: 1, finalStatus: "partially_completed", snapshotRun: "run-1" };

console.table([{ caso: "Plan de persistencia P1", esperado: JSON.stringify(expected), obtenido: JSON.stringify(actual) }]);
assert.deepEqual(actual, expected);
console.log("Correctas: plan de persistencia para resultados, evidencia e informe.");
