import assert from "node:assert/strict";
import { buildLocalDemoReport, LOCAL_DEMO_PROFILE } from "../src/lib/demo-report.ts";

const demo = buildLocalDemoReport({ organizationId: "org-1", websiteId: "site-1", websiteHostId: "host-1", userId: "user-1", observedAt: "2026-10-27T16:00:00.000Z" });
const actual = { profile: demo.run.profile_id, status: demo.run.status, executions: demo.ruleExecutions.length, findings: demo.findings.length };
const expected = { profile: LOCAL_DEMO_PROFILE, status: "completed", executions: 3, findings: 2 };
console.table([{ caso: "Informe demo persistible", esperado: JSON.stringify(expected), obtenido: JSON.stringify(actual) }]);
assert.deepEqual(actual, expected);
console.log("Correctas: datos de prueba listos para persistirse sin tráfico externo.");
