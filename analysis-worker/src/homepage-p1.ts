import type { RuleResult } from "../../src/lib/rules/p1.ts";
import { evaluateLink001, evaluateSeo001 } from "../../src/lib/rules/p1.ts";
import type { HomepageObservation } from "./homepage-collector.ts";

export type HomepageP1Input = {
  observation: HomepageObservation;
  declaredIndexable: boolean | null;
  internalLinkStatuses: Readonly<Record<string, number | undefined>>;
};

export function evaluateHomepageP1(input: HomepageP1Input): RuleResult[] {
  const pagePath = new URL(input.observation.url).pathname;
  const seo = evaluateSeo001({
    declaredIndexable: input.declaredIndexable,
    effectiveNoindex: input.observation.effectiveNoindex,
    pagePath
  });
  const links = input.observation.internalLinkPaths.map((targetPath) =>
    evaluateLink001({
      sourcePath: pagePath,
      targetPath,
      targetStatus: input.internalLinkStatuses[targetPath],
      targetIsAuthorizedInternal: true
    })
  );
  return [seo, ...links];
}
