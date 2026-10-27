export type RuleOutcome = "finding" | "passed" | "blocked" | "not_applicable";

export type RuleResult = {
  ruleId: "TLS-001" | "LINK-001" | "SEO-001";
  outcome: RuleOutcome;
  summary: string;
  evidence: Record<string, string | number | boolean>;
};

function result(
  ruleId: RuleResult["ruleId"],
  outcome: RuleOutcome,
  summary: string,
  evidence: RuleResult["evidence"]
): RuleResult {
  return { ruleId, outcome, summary, evidence };
}

export function evaluateTls001(input: {
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

export function evaluateLink001(input: {
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

export function evaluateSeo001(input: {
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
