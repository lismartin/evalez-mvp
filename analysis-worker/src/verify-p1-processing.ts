import assert from "node:assert/strict";
import { evaluateLink001, evaluateSeo001, evaluateTls001 } from "../../src/lib/rules/p1.ts";
import { processP1Results } from "./process-p1-results.ts";

const processed = processP1Results([
  evaluateTls001({ protocol: "https", observedAt: "2026-10-27T12:00:00Z", certificate: { validForHost: true, chainTrusted: true, expiresAt: "2027-10-27T12:00:00Z" } }),
  evaluateLink001({ sourcePath: "/servicios", targetPath: "/archivo", targetStatus: 404, targetIsAuthorizedInternal: true }),
  evaluateSeo001({ declaredIndexable: true, effectiveNoindex: null, pagePath: "/servicios" })
], { organizationId: "org-1", websiteId: "site-1", host: "www.tusitio.ch", plannedRuleIds: ["TLS-001", "LINK-001", "SEO-001"] });

const expected = { executions: 3, findings: 1, planned: 3, successful: 2, blockedOrFailed: 1, skipped: 0 };
const actual = {
  executions: processed.ruleExecutions.length,
  findings: processed.findings.length,
  planned: processed.coverage.planned,
  successful: processed.coverage.successful,
  blockedOrFailed: processed.coverage.blockedOrFailed,
  skipped: processed.coverage.skipped
};

console.table([{ caso: "Conversión de resultados P1", esperado: JSON.stringify(expected), obtenido: JSON.stringify(actual) }]);

if (JSON.stringify(actual) !== JSON.stringify(expected) || processed.findings[0]?.ruleId !== "LINK-001") {
  throw new Error("Falló la conversión de resultados P1 para persistencia.");
}

console.log("Correctas: resultados P1 preparados para ejecuciones, hallazgos y evidencia.");

const context = {
  organizationId: "org-1",
  websiteId: "site-1",
  host: "www.tusitio.ch",
  plannedRuleIds: ["TLS-001", "LINK-001", "SEO-001"] as const
};
const firstTls = evaluateTls001({ protocol: "https", observedAt: "2026-10-27T12:00:00Z", certificate: { validForHost: true, chainTrusted: true, expiresAt: "2026-11-01T12:00:00Z" } });
const renewedTls = evaluateTls001({ protocol: "https", observedAt: "2026-10-27T12:00:00Z", certificate: { validForHost: true, chainTrusted: true, expiresAt: "2027-11-01T12:00:00Z" } });
const firstFingerprint = processP1Results([firstTls], context).findings[0]?.fingerprint;
const renewedFingerprint = processP1Results([renewedTls], context).findings[0]?.fingerprint;
assert.equal(firstFingerprint, renewedFingerprint, "La renovacion del certificado no cambia la huella");

const planned = processP1Results([
  evaluateLink001({ sourcePath: "/", targetPath: "/archivo", targetStatus: 404, targetIsAuthorizedInternal: true }),
  evaluateLink001({ sourcePath: "/contacto", targetPath: "/archivo", targetStatus: 404, targetIsAuthorizedInternal: true }),
  evaluateLink001({ sourcePath: "/", targetPath: "/error", targetStatus: 500, targetIsAuthorizedInternal: true })
], context);
assert.deepEqual(planned.coverage, { planned: 3, successful: 0, blockedOrFailed: 1, skipped: 2 });
assert.equal(planned.findings.length, 1, "Un destino roto compartido forma un solo hallazgo");
assert.deepEqual(planned.findings[0]?.evidence.source_paths, ["/", "/contacto"]);
assert.equal(planned.ruleExecutions.find((execution) => execution.ruleId === "LINK-001")?.executionStatus, "failed");
