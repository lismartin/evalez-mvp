import { evaluateLink001, evaluateSeo001, evaluateTls001, type RuleOutcome } from "./p1.ts";

export const p1Fixtures: { name: string; expected: RuleOutcome; actual: RuleOutcome }[] = [
  { name: "TLS caducado genera un hallazgo", expected: "finding", actual: evaluateTls001({ protocol: "https", observedAt: "2026-10-23T12:00:00Z", certificate: { validForHost: true, chainTrusted: true, expiresAt: "2026-10-22T12:00:00Z" } }).outcome },
  { name: "Enlace interno 404 genera un hallazgo", expected: "finding", actual: evaluateLink001({ sourcePath: "/servicios", targetPath: "/archivo", targetStatus: 404, targetIsAuthorizedInternal: true }).outcome },
  { name: "Destino no autorizado queda bloqueado", expected: "blocked", actual: evaluateLink001({ sourcePath: "/", targetPath: "https://externo.example", targetIsAuthorizedInternal: false }).outcome },
  { name: "Noindex contradictorio genera un hallazgo", expected: "finding", actual: evaluateSeo001({ declaredIndexable: true, effectiveNoindex: true, pagePath: "/servicios" }).outcome },
  { name: "Sin intención declarada SEO-001 no aplica", expected: "not_applicable", actual: evaluateSeo001({ declaredIndexable: null, effectiveNoindex: true, pagePath: "/" }).outcome }
];
