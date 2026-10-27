export type ReportFinding = { ruleId: string; priority: string; title: string };

export type ReportNarrative = {
  mode: "deterministic";
  headline: string;
  summary: string;
  nextSteps: string[];
};

const ruleAdvice: Record<string, string> = {
  "TLS-001": "Revisa el certificado, el nombre del host y la cadena de confianza antes de renovar o publicar cambios.",
  "LINK-001": "Corrige o redirige los enlaces internos que llevan a un recurso no disponible.",
  "SEO-001": "Revisa la directiva noindex y confirma que coincide con la intención de indexación registrada."
};

export function buildReportNarrative(input: { status: string; findings: ReportFinding[]; coverage?: { evaluated?: number; blocked?: number; notApplicable?: number } }): ReportNarrative {
  const uniqueAdvice = [...new Set(input.findings.map((finding) => ruleAdvice[finding.ruleId]).filter(Boolean))];
  const blocked = input.coverage?.blocked ?? 0;
  const evaluated = input.coverage?.evaluated ?? 0;
  const headline = input.findings.length
    ? `${input.findings.length} hallazgo${input.findings.length === 1 ? "" : "s"} requiere${input.findings.length === 1 ? "" : "n"} revisión.`
    : "No se registraron hallazgos técnicos en esta ejecución.";
  const coverageText = `${evaluated} regla${evaluated === 1 ? "" : "s"} evaluada${evaluated === 1 ? "" : "s"}${blocked ? ` y ${blocked} bloqueada${blocked === 1 ? "" : "s"}` : ""}`;
  return {
    mode: "deterministic",
    headline,
    summary: `La ejecución terminó como ${input.status}. Se registraron ${coverageText}. Este texto se genera a partir de los resultados técnicos guardados; no modifica ni crea hallazgos.`,
    nextSteps: uniqueAdvice.length ? uniqueAdvice : ["Conserva este informe como referencia y revisa el alcance cubierto antes de tomar decisiones."]
  };
}
