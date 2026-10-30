import { evaluateLink001, evaluateSeo001, evaluateTls001, type RuleOutcome } from "./p1.ts";
import type { RuleResult } from "./p1.ts";

export const p1Fixtures: { name: string; expected: RuleOutcome; actual: RuleOutcome }[] = [
  { name: "TLS caducado genera un hallazgo", expected: "finding", actual: evaluateTls001({ protocol: "https", observedAt: "2026-10-23T12:00:00Z", certificate: { validForHost: true, chainTrusted: true, expiresAt: "2026-10-22T12:00:00Z" } }).outcome },
  { name: "Enlace interno 404 genera un hallazgo", expected: "finding", actual: evaluateLink001({ sourcePath: "/servicios", targetPath: "/archivo", targetStatus: 404, targetIsAuthorizedInternal: true }).outcome },
  { name: "Destino no autorizado queda bloqueado", expected: "blocked", actual: evaluateLink001({ sourcePath: "/", targetPath: "https://externo.example", targetIsAuthorizedInternal: false }).outcome },
  { name: "Noindex contradictorio genera un hallazgo", expected: "finding", actual: evaluateSeo001({ declaredIndexable: true, effectiveNoindex: true, pagePath: "/servicios" }).outcome },
  { name: "Sin intención declarada SEO-001 deja una nota de revisión", expected: "review_note", actual: evaluateSeo001({ declaredIndexable: null, effectiveNoindex: true, pagePath: "/" }).outcome }
];

type DetailedRuleFixture = {
  name: string;
  expected: Pick<RuleResult, "outcome" | "findingType" | "severity" | "customerPriority" | "detectionConfidence" | "causeKey">;
  actual: RuleResult;
};

export const detailedP1Fixtures: DetailedRuleFixture[] = [
  {
    name: "TLS caducado genera un hallazgo confirmado de alta urgencia",
    expected: { outcome: "finding", findingType: "confirmed_problem", severity: "high", customerPriority: "act_now", detectionConfidence: "high", causeKey: "expired" },
    actual: evaluateTls001({ protocol: "https", observedAt: "2026-10-23T12:00:00Z", certificate: { validForHost: true, chainTrusted: true, expiresAt: "2026-10-22T12:00:00Z" } })
  },
  {
    name: "TLS aun no valido genera un hallazgo",
    expected: { outcome: "finding", findingType: "confirmed_problem", severity: "high", customerPriority: "act_now", detectionConfidence: "high", causeKey: "not_yet_valid" },
    actual: evaluateTls001({ protocol: "https", observedAt: "2026-10-23T12:00:00Z", certificate: { validForHost: true, chainTrusted: true, notBefore: "2026-10-24T12:00:00Z", expiresAt: "2027-10-22T12:00:00Z" } })
  },
  {
    name: "Fallo del sondeo TLS queda bloqueado con su causa",
    expected: { outcome: "blocked", findingType: "review_note", severity: "indeterminable", customerPriority: "review_required", detectionConfidence: "low", causeKey: "dns_unavailable" },
    actual: evaluateTls001({ protocol: "https", observedAt: "2026-10-23T12:00:00Z", failure: "dns_unavailable" })
  },
  {
    name: "Enlace interno 500 es una prueba fallida",
    expected: { outcome: "failed", findingType: "review_note", severity: "indeterminable", customerPriority: "review_required", detectionConfidence: "low", causeKey: "/archivo" },
    actual: evaluateLink001({ sourcePath: "/servicios", targetPath: "/archivo", targetStatus: 500, targetIsAuthorizedInternal: true })
  },
  {
    name: "Sin intencion declarada SEO-001 deja nota de revision",
    expected: { outcome: "review_note", findingType: "review_note", severity: "indeterminable", customerPriority: "review_required", detectionConfidence: "low", causeKey: "/" },
    actual: evaluateSeo001({ declaredIndexable: null, effectiveNoindex: true, pagePath: "/" })
  },
  {
    name: "Noindex intencional queda como informacion",
    expected: { outcome: "not_applicable", findingType: "information", severity: "informational", customerPriority: "information", detectionConfidence: "high", causeKey: "/campana" },
    actual: evaluateSeo001({ declaredIndexable: false, effectiveNoindex: true, pagePath: "/campana" })
  }
];
