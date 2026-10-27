import { evaluateLink001, evaluateSeo001, evaluateTls001 } from "../../src/lib/rules/p1.ts";
import { processP1Results } from "./process-p1-results.ts";

const processed = processP1Results([
  evaluateTls001({ protocol: "https", observedAt: "2026-10-27T12:00:00Z", certificate: { validForHost: true, chainTrusted: true, expiresAt: "2027-10-27T12:00:00Z" } }),
  evaluateLink001({ sourcePath: "/servicios", targetPath: "/archivo", targetStatus: 404, targetIsAuthorizedInternal: true }),
  evaluateSeo001({ declaredIndexable: true, effectiveNoindex: null, pagePath: "/servicios" })
]);

const expected = { executions: 3, findings: 1, evaluated: 2, blocked: 1, notApplicable: 0 };
const actual = {
  executions: processed.ruleExecutions.length,
  findings: processed.findings.length,
  evaluated: processed.coverage.evaluated,
  blocked: processed.coverage.blocked,
  notApplicable: processed.coverage.notApplicable
};

console.table([{ caso: "Conversión de resultados P1", esperado: JSON.stringify(expected), obtenido: JSON.stringify(actual) }]);

if (JSON.stringify(actual) !== JSON.stringify(expected) || processed.findings[0]?.ruleId !== "LINK-001") {
  throw new Error("Falló la conversión de resultados P1 para persistencia.");
}

console.log("Correctas: resultados P1 preparados para ejecuciones, hallazgos y evidencia.");
