export type GeminiReportInput = {
  ruleId: string;
  title: string;
  priority: string;
  evidence: unknown;
};

export type GeminiReportExplanation = {
  explanation: string;
  recommendedAction: string;
  caveat: string;
};

export function buildGeminiReportPrompt(input: GeminiReportInput) {
  return `Explica un hallazgo técnico de un informe de sitio web en español claro. Usa exclusivamente los datos entregados. No inventes causas, impacto, evidencia, prioridad ni resultados. No des instrucciones destructivas. No digas que verificaste el sitio. Devuelve JSON con exactamente las claves explanation, recommendedAction y caveat, todas texto breve.

Hallazgo técnico:
${JSON.stringify(input)}`;
}

export function parseGeminiReportExplanation(value: string): GeminiReportExplanation {
  const parsed = JSON.parse(value) as Partial<GeminiReportExplanation>;
  if (!parsed.explanation || !parsed.recommendedAction || !parsed.caveat) {
    throw new Error("La respuesta de Gemini no contiene la estructura esperada.");
  }
  return {
    explanation: String(parsed.explanation).trim(),
    recommendedAction: String(parsed.recommendedAction).trim(),
    caveat: String(parsed.caveat).trim()
  };
}
