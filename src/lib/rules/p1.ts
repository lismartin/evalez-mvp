export type RuleOutcome = "finding" | "passed" | "failed" | "blocked" | "not_applicable" | "review_note";
export type FindingType = "confirmed_problem" | "protection_recommendation" | "review_note" | "information";
export type Severity = "critical" | "high" | "medium" | "low" | "informational" | "indeterminable";
export type CustomerPriority = "act_now" | "later" | "optional" | "review_required" | "information";
export type DetectionConfidence = "high" | "medium" | "low";

export type RuleResult = {
  ruleId: "TLS-001" | "LINK-001" | "SEO-001";
  ruleVersion: "1";
  outcome: RuleOutcome;
  findingType: FindingType;
  severity: Severity;
  customerPriority: CustomerPriority;
  detectionConfidence: DetectionConfidence;
  causeKey: string;
  summary: string;
  evidence: Record<string, string | number | boolean>;
};

type Classification = Pick<RuleResult, "outcome" | "findingType" | "severity" | "customerPriority" | "detectionConfidence" | "causeKey">;

function result(
  ruleId: RuleResult["ruleId"],
  classification: Classification | RuleOutcome,
  summary: string,
  evidence: RuleResult["evidence"]
): RuleResult {
  const normalized = typeof classification === "string" ? information(classification === "passed" ? "passed" : "not_applicable", "legacy") : classification;
  return { ruleId, ruleVersion: "1", ...normalized, summary, evidence };
}

const blocked = (causeKey: string): Classification => ({ outcome: "blocked", findingType: "review_note", severity: "indeterminable", customerPriority: "review_required", detectionConfidence: "low", causeKey });
const failed = (causeKey: string): Classification => ({ outcome: "failed", findingType: "review_note", severity: "indeterminable", customerPriority: "review_required", detectionConfidence: "low", causeKey });
const information = (outcome: "passed" | "not_applicable", causeKey: string): Classification => ({ outcome, findingType: "information", severity: "informational", customerPriority: "information", detectionConfidence: "high", causeKey });

export function evaluateTls001(input: {
  protocol: "http" | "https";
  observedAt: string;
  failure?: "destination_blocked" | "dns_unavailable" | "timeout" | "tls_connection_failed";
  certificate?: { validForHost: boolean; chainTrusted: boolean; notBefore?: string; expiresAt: string };
}): RuleResult {
  if (input.protocol !== "https") return result("TLS-001", information("not_applicable", "https_not_available"), "HTTPS no esta disponible para validar TLS.", { protocol: input.protocol });
  if (input.failure) return result("TLS-001", blocked(input.failure), "El sondeo TLS no pudo completarse.", { protocol: input.protocol, failure: input.failure });
  if (!input.certificate) return result("TLS-001", blocked("certificate_not_observed"), "No se obtuvo un certificado TLS verificable.", { protocol: input.protocol });

  const observedAt = new Date(input.observedAt);
  const expired = new Date(input.certificate.expiresAt) <= observedAt;
  const notYetValid = input.certificate.notBefore !== undefined && new Date(input.certificate.notBefore) > observedAt;
  const causeKey = expired ? "expired" : notYetValid ? "not_yet_valid" : !input.certificate.validForHost ? "name_mismatch" : !input.certificate.chainTrusted ? "untrusted_chain" : "certificate_valid";
  const evidence = {
    expires_at: input.certificate.expiresAt,
    ...(input.certificate.notBefore === undefined ? {} : { not_before: input.certificate.notBefore }),
    certificate_expired: expired,
    certificate_not_yet_valid: notYetValid,
    valid_for_host: input.certificate.validForHost,
    chain_trusted: input.certificate.chainTrusted
  };
  if (causeKey !== "certificate_valid") {
    return result("TLS-001", { outcome: "finding", findingType: "confirmed_problem", severity: "high", customerPriority: "act_now", detectionConfidence: "high", causeKey }, "La validacion TLS fallo.", evidence);
  }
  return result("TLS-001", information("passed", causeKey), "El certificado TLS es valido para el host y su cadena es confiable.", evidence);
}

export function evaluateLink001(input: {
  sourcePath: string;
  targetPath: string;
  targetStatus?: number;
  failure?: "timeout" | "transport_error";
  targetIsAuthorizedInternal: boolean;
}): RuleResult {
  if (!input.targetIsAuthorizedInternal) return result("LINK-001", blocked("unauthorized_destination"), "El destino no pertenece a un host interno autorizado.", { source_path: input.sourcePath, target_path: input.targetPath });
  if (input.failure || input.targetStatus === undefined || input.targetStatus >= 500) {
    return result("LINK-001", failed(input.targetPath), "No se pudo completar la comprobacion del destino interno autorizado.", { source_path: input.sourcePath, target_path: input.targetPath, ...(input.targetStatus === undefined ? {} : { target_status: input.targetStatus }), failure: input.failure ?? (input.targetStatus === undefined ? "transport_error" : "server_error") });
  }
  if (input.targetStatus === 404 || input.targetStatus === 410) {
    return result("LINK-001", { outcome: "finding", findingType: "confirmed_problem", severity: "low", customerPriority: "later", detectionConfidence: "high", causeKey: input.targetPath }, "Un enlace interno autorizado apunta a un destino no disponible.", { source_path: input.sourcePath, target_path: input.targetPath, target_status: input.targetStatus });
  }
  return result("LINK-001", information("passed", input.targetPath), "El destino interno autorizado no respondio 404 ni 410.", { source_path: input.sourcePath, target_path: input.targetPath, target_status: input.targetStatus });
}

export function evaluateSeo001(input: {
  declaredIndexable: boolean | null;
  effectiveNoindex: boolean | null;
  pagePath: string;
}): RuleResult {
  if (input.declaredIndexable === null) return result("SEO-001", { outcome: "review_note", findingType: "review_note", severity: "indeterminable", customerPriority: "review_required", detectionConfidence: "low", causeKey: input.pagePath }, "No hay intencion declarada de indexacion; se requiere comprobacion.", { page_path: input.pagePath });
  if (input.declaredIndexable === false) return result("SEO-001", information("not_applicable", input.pagePath), "El noindex intencional es informacion.", { page_path: input.pagePath, ...(input.effectiveNoindex === null ? {} : { effective_noindex: input.effectiveNoindex }) });
  if (input.effectiveNoindex === null) return result("SEO-001", blocked(input.pagePath), "No se pudo determinar la directiva efectiva de indexacion.", { page_path: input.pagePath });
  if (input.effectiveNoindex) return result("SEO-001", { outcome: "finding", findingType: "confirmed_problem", severity: "medium", customerPriority: "later", detectionConfidence: "high", causeKey: input.pagePath }, "Una directiva noindex efectiva contradice la intencion declarada de indexacion.", { page_path: input.pagePath, declared_indexable: true, effective_noindex: true });
  return result("SEO-001", information("passed", input.pagePath), "No se observo una contradiccion noindex con la intencion declarada.", { page_path: input.pagePath, declared_indexable: true, effective_noindex: false });
}

function legacyEvaluateTls001(input: {
  protocol: "http" | "https";
  observedAt: string;
  certificate?: { validForHost: boolean; chainTrusted: boolean; expiresAt: string };
}): RuleResult {
  if (input.protocol !== "https") {
    return result("TLS-001", "not_applicable", "El host no respondió mediante HTTPS; esta regla no puede validar un certificado TLS.", { protocol: input.protocol });
  }
  if (!input.certificate) {
    return result("TLS-001", "blocked", "No se obtuvo un certificado TLS verificable para el host autorizado.", { protocol: input.protocol });
  }

  const expired = new Date(input.certificate.expiresAt) <= new Date(input.observedAt);
  const invalid = expired || !input.certificate.validForHost || !input.certificate.chainTrusted;
  if (invalid) {
    return result("TLS-001", "finding", "La validación TLS del host autorizado falló.", {
      expires_at: input.certificate.expiresAt,
      certificate_expired: expired,
      valid_for_host: input.certificate.validForHost,
      chain_trusted: input.certificate.chainTrusted
    });
  }

  return result("TLS-001", "passed", "El certificado TLS observado es válido para el host y su cadena es confiable.", {
    expires_at: input.certificate.expiresAt,
    valid_for_host: true,
    chain_trusted: true
  });
}

function legacyEvaluateLink001(input: {
  sourcePath: string;
  targetPath: string;
  targetStatus?: number;
  targetIsAuthorizedInternal: boolean;
}): RuleResult {
  if (!input.targetIsAuthorizedInternal) {
    return result("LINK-001", "blocked", "El destino no pertenece a un host interno autorizado y no se comprobó.", {
      source_path: input.sourcePath,
      target_path: input.targetPath
    });
  }
  if (input.targetStatus === undefined) {
    return result("LINK-001", "blocked", "No se obtuvo una respuesta verificable del destino interno autorizado.", {
      source_path: input.sourcePath,
      target_path: input.targetPath
    });
  }
  if (input.targetStatus === 404 || input.targetStatus === 410) {
    return result("LINK-001", "finding", "Un enlace interno autorizado apunta a un destino no disponible.", {
      source_path: input.sourcePath,
      target_path: input.targetPath,
      target_status: input.targetStatus
    });
  }
  return result("LINK-001", "passed", "El destino interno autorizado no respondió 404 ni 410.", {
    source_path: input.sourcePath,
    target_path: input.targetPath,
    target_status: input.targetStatus
  });
}

function legacyEvaluateSeo001(input: {
  declaredIndexable: boolean | null;
  effectiveNoindex: boolean | null;
  pagePath: string;
}): RuleResult {
  if (input.declaredIndexable !== true) {
    return result("SEO-001", "not_applicable", "No existe una intención declarada de indexación que permita evaluar una contradicción noindex.", {
      page_path: input.pagePath
    });
  }
  if (input.effectiveNoindex === null) {
    return result("SEO-001", "blocked", "No se pudo determinar la directiva efectiva de indexación de la página.", {
      page_path: input.pagePath
    });
  }
  if (input.effectiveNoindex) {
    return result("SEO-001", "finding", "Una directiva noindex efectiva contradice la intención declarada de indexación.", {
      page_path: input.pagePath,
      declared_indexable: true,
      effective_noindex: true
    });
  }
  return result("SEO-001", "passed", "No se observó una contradicción noindex con la intención declarada.", {
    page_path: input.pagePath,
    declared_indexable: true,
    effective_noindex: false
  });
}
