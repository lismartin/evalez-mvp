import { completeLocalFixtureJob, reserveLocalFixtureJob } from "../../src/lib/local-fixture-queue.ts";
import { evaluateLink001, evaluateSeo001, evaluateTls001 } from "../../src/lib/rules/p1.ts";

const job = await reserveLocalFixtureJob();

if (!job) {
  console.log("No hay trabajos de fixture pendientes.");
  process.exit(0);
}

const results = [
  evaluateTls001({ protocol: "https", observedAt: "2026-10-23T12:00:00Z", certificate: { validForHost: true, chainTrusted: true, expiresAt: "2027-10-23T12:00:00Z" } }),
  evaluateLink001({ sourcePath: "/servicios", targetPath: "/archivo", targetStatus: 404, targetIsAuthorizedInternal: true }),
  evaluateSeo001({ declaredIndexable: true, effectiveNoindex: true, pagePath: "/servicios" })
];

const summary = {
  passed: results.filter((result) => result.outcome === "passed").length,
  findings: results.filter((result) => result.outcome === "finding").length,
  blocked: results.filter((result) => result.outcome === "blocked").length
};

await completeLocalFixtureJob(job.id, summary);
console.log(`Fixture ${job.id} completado: ${summary.passed} correctas, ${summary.findings} hallazgos, ${summary.blocked} bloqueadas.`);
