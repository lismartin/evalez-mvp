import assert from "node:assert/strict";
import { evaluateHomepageP1 } from "./homepage-p1.ts";
import { processP1Results } from "./process-p1-results.ts";

const results = evaluateHomepageP1({
  observation: {
    url: "https://www.tusitio.ch/",
    status: 200,
    effectiveNoindex: true,
    internalLinkPaths: ["/archivo", "/contacto"]
  },
  declaredIndexable: true,
  internalLinkStatuses: { "/archivo": 404, "/contacto": 200 }
});
const processed = processP1Results(results);
const actual = {
  outcomes: results.map((result) => `${result.ruleId}:${result.outcome}`),
  executions: processed.ruleExecutions.length,
  findings: processed.findings.length,
  linkObservations: processed.ruleExecutions.find((item) => item.ruleId === "LINK-001")?.details.observations.length
};
const expected = {
  outcomes: ["SEO-001:finding", "LINK-001:finding", "LINK-001:passed"],
  executions: 2,
  findings: 2,
  linkObservations: 2
};

console.table([{ caso: "Portada a reglas P1", esperado: JSON.stringify(expected), obtenido: JSON.stringify(actual) }]);
assert.deepEqual(actual, expected);
console.log("Correctas: observaciones de portada conectadas a SEO-001 y LINK-001.");
