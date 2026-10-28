import assert from "node:assert/strict";
import { buildGeminiReportPrompt, parseGeminiReportExplanation } from "../src/lib/gemini-report.ts";

const prompt = buildGeminiReportPrompt({ ruleId: "SEO-001", title: "Una directiva noindex contradice la intención declarada.", priority: "medium", evidence: { page_path: "/servicios", effective_noindex: true } });
const response = parseGeminiReportExplanation(JSON.stringify({
  explanation: "La página indica noindex aunque se registró como indexable.",
  recommendedAction: "Revisa la configuración robots de la página de servicios.",
  caveat: "Confirma el cambio antes de publicarlo."
}));
assert.match(prompt, /No inventes causas/);
assert.equal(response.recommendedAction, "Revisa la configuración robots de la página de servicios.");
console.log("Correctas: contrato de Gemini limitado a explicación basada en evidencia.");
