import { evaluateTls001, type RuleResult } from "../../src/lib/rules/p1.ts";
import type { ControlledEgress } from "./controlled-egress.ts";
import { collectHomepage, collectInternalLinkStatuses } from "./homepage-collector.ts";
import { evaluateHomepageP1 } from "./homepage-p1.ts";
import { processP1Results, type ProcessedP1Results } from "./process-p1-results.ts";
import type { PersistedRunContext } from "./persistence-plan.ts";
import type { ReservedStatic1Run } from "./scheduled-run-reservation.ts";

export type ReservedRunTarget = {
  hostname: string;
  intendedIndexability: boolean | null;
};

export type TlsProbe = {
  inspect(hostname: string, observedAt: string): Promise<{
    protocol: "http" | "https";
    certificate?: { validForHost: boolean; chainTrusted: boolean; expiresAt: string };
  }>;
};

export type Static1RunnerDependencies = {
  reserveNextRun(): Promise<ReservedStatic1Run | null>;
  loadTarget(run: ReservedStatic1Run): Promise<ReservedRunTarget>;
  egress: ControlledEgress;
  tlsProbe: TlsProbe;
  persist(context: PersistedRunContext, processed: ProcessedP1Results, observedAt: string): Promise<"completed" | "partially_completed">;
  now(): string;
};

export type Static1RunnerResult =
  | { processed: false; reason: "no_scheduled_run" }
  | { processed: true; analysisRunId: string; status: "completed" | "partially_completed"; results: RuleResult[] };

export async function runOneStatic1Analysis(dependencies: Static1RunnerDependencies): Promise<Static1RunnerResult> {
  const run = await dependencies.reserveNextRun();
  if (!run) return { processed: false, reason: "no_scheduled_run" };

  const target = await dependencies.loadTarget(run);
  const observedAt = dependencies.now();
  const tlsObservation = await dependencies.tlsProbe.inspect(target.hostname, observedAt);
  const tls = evaluateTls001({ ...tlsObservation, observedAt });
  const homepage = await collectHomepage(dependencies.egress, target.hostname);

  const results: RuleResult[] = [tls];
  if (homepage.collected) {
    const linkStatuses = await collectInternalLinkStatuses(dependencies.egress, homepage.observation);
    results.push(...evaluateHomepageP1({
      observation: homepage.observation,
      declaredIndexable: target.intendedIndexability,
      internalLinkStatuses: linkStatuses
    }));
  }

  const processed = processP1Results(results);
  const status = await dependencies.persist({
    analysisRunId: run.id,
    organizationId: run.organization_id,
    websiteId: run.website_id
  }, processed, observedAt);

  return { processed: true, analysisRunId: run.id, status, results };
}
