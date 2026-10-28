export const LOCAL_DEMO_PROFILE = "DEMO-LOCAL";

export function buildLocalDemoReport(input: { organizationId: string; websiteId: string; websiteHostId: string; userId: string; observedAt: string }) {
  return {
    run: {
      organization_id: input.organizationId,
      website_id: input.websiteId,
      website_host_id: input.websiteHostId,
      profile_id: LOCAL_DEMO_PROFILE,
      profile_version: "1",
      status: "completed",
      requested_by: input.userId,
      scheduled_at: input.observedAt,
      started_at: input.observedAt,
      completed_at: input.observedAt,
      coverage: { evaluated: 3, blocked: 0, notApplicable: 0, source: "local_demo_fixture" }
    },
    ruleExecutions: [
      { rule_id: "TLS-001", rule_version: "1", execution_status: "successful", technical_result: "no_anomaly", details: { summary: "El certificado TLS de ejemplo es válido.", observations: [{ valid_for_host: true, chain_trusted: true }] } },
      { rule_id: "SEO-001", rule_version: "1", execution_status: "successful", technical_result: "confirmed_finding", details: { summary: "Una directiva noindex contradice la intención declarada.", observations: [{ page_path: "/servicios", declared_indexable: true, effective_noindex: true }] } },
      { rule_id: "LINK-001", rule_version: "1", execution_status: "successful", technical_result: "confirmed_finding", details: { summary: "Un enlace interno autorizado apunta a un destino no disponible.", observations: [{ source_path: "/", target_path: "/contacto-anterior", target_status: 404 }] } }
    ],
    findings: [
      { ruleId: "SEO-001", fingerprint: "demo:seo-001:/servicios:noindex", priority: "medium", title: "La página de servicios está bloqueada para buscadores.", evidence: { page_path: "/servicios", declared_indexable: true, effective_noindex: true } },
      { ruleId: "LINK-001", fingerprint: "demo:link-001:/:/contacto-anterior:404", priority: "medium", title: "El enlace de contacto no lleva a una página válida.", evidence: { source_path: "/", target_path: "/contacto-anterior", target_status: 404 } }
    ]
  };
}
