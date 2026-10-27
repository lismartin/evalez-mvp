import type { ControlledEgress, EgressResult } from "./controlled-egress.ts";
import { normalizeAuthorizedHost } from "./safety.ts";

export type HomepageObservation = {
  url: string;
  status: number;
  effectiveNoindex: boolean | null;
  internalLinkPaths: string[];
};

export type HomepageCollection =
  | { collected: true; observation: HomepageObservation }
  | { collected: false; reason: Exclude<EgressResult, { allowed: true }> ["reason"] };

function attributeValue(tag: string, attribute: string): string | null {
  const match = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2] ?? null;
}

function hasEffectiveNoindex(html: string, headers: Record<string, string>): boolean {
  const headerValue = Object.entries(headers).find(([key]) => key.toLowerCase() === "x-robots-tag")?.[1] ?? "";
  if (/\bnoindex\b/i.test(headerValue)) return true;

  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return metaTags.some((tag) => {
    const name = attributeValue(tag, "name");
    const content = attributeValue(tag, "content");
    return name?.toLowerCase() === "robots" && Boolean(content && /\bnoindex\b/i.test(content));
  });
}

function internalPaths(html: string, host: string): string[] {
  const links = html.match(/<a\b[^>]*>/gi) ?? [];
  const paths = new Set<string>();

  for (const tag of links) {
    const href = attributeValue(tag, "href");
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const url = new URL(href, `https://${host}/`);
      if (normalizeAuthorizedHost(url.hostname) === host) paths.add(`${url.pathname}${url.search}`);
    } catch {
      // Un enlace que no puede interpretarse no se sigue ni se convierte en destino.
    }
  }
  return [...paths].sort();
}

export async function collectHomepage(
  egress: ControlledEgress,
  host: string,
  path = "/"
): Promise<HomepageCollection> {
  const normalizedHost = normalizeAuthorizedHost(host);
  if (!normalizedHost) return { collected: false, reason: "destination_blocked" };

  const response = await egress.request(`https://${normalizedHost}${path.startsWith("/") ? path : `/${path}`}`, "GET");
  if (!response.allowed) return { collected: false, reason: response.reason };

  return {
    collected: true,
    observation: {
      url: `https://${normalizedHost}${path.startsWith("/") ? path : `/${path}`}`,
      status: response.status,
      effectiveNoindex: hasEffectiveNoindex(response.body, response.headers),
      internalLinkPaths: internalPaths(response.body, normalizedHost)
    }
  };
}

export async function collectInternalLinkStatuses(
  egress: ControlledEgress,
  observation: HomepageObservation
): Promise<Record<string, number | undefined>> {
  const origin = new URL(observation.url).origin;
  const statuses: Record<string, number | undefined> = {};
  for (const path of observation.internalLinkPaths) {
    const response = await egress.request(`${origin}${path}`, "GET");
    statuses[path] = response.allowed ? response.status : undefined;
  }
  return statuses;
}
