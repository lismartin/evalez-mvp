import assert from "node:assert/strict";
import { buildReportNarrative } from "../src/lib/report-assistant.ts";

const narrative = buildReportNarrative({
  status: "partially_completed",
  findings: [
    { ruleId: "LINK-001", priority: "medium", title: "Un enlace interno autorizado apunta a un destino no disponible." },
    { ruleId: "SEO-001", priority: "medium", title: "Una directiva noindex efectiva contradice la intención declarada de indexación." }
  ],
  coverage: { evaluated: 2, blocked: 1, notApplicable: 0 }
});
const actual = { mode: narrative.mode, headline: narrative.headline, steps: narrative.nextSteps.length };
const expected = { mode: "deterministic", headline: "2 hallazgos requieren revisión.", steps: 2 };
console.table([{ caso: "Resumen de informe basado en resultados", esperado: JSON.stringify(expected), obtenido: JSON.stringify(actual) }]);
assert.deepEqual(actual, expected);
console.log("Correctas: resumen de informe generado exclusivamente desde hallazgos existentes.");
