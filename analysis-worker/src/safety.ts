export const STATIC_1_LIMITS = {
  maxHtmlPages: 50,
  maxHttpRequests: 500,
  maxConcurrentRequestsPerSite: 2,
  maxRequestsPerSecondPerSite: 1,
  httpTimeoutMs: 15_000,
  runTimeoutMs: 20 * 60_000
} as const;

export function normalizeAuthorizedHost(value: string) {
  const host = value.trim().toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || isIpv4Literal(host)) return null;
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host)) return null;
  return host;
}

export function isIpv4Literal(host: string) {
  const parts = host.split(".");
  return parts.length === 4 && parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

export function isBlockedIpv4(host: string) {
  if (!isIpv4Literal(host)) return false;
  const [a, b] = host.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168);
}

export function canStartStatic1Job(input: {
  requestedHost: string;
  authorizedHosts: string[];
  authorizationValid: boolean;
  startedAtMs: number;
  nowMs: number;
}) {
  const requestedHost = normalizeAuthorizedHost(input.requestedHost);
  if (!input.authorizationValid) return { allowed: false, reason: "authorization_missing" as const };
  if (!requestedHost || isBlockedIpv4(input.requestedHost)) return { allowed: false, reason: "destination_blocked" as const };
  const authorized = input.authorizedHosts.map(normalizeAuthorizedHost).filter(Boolean);
  if (!authorized.includes(requestedHost)) return { allowed: false, reason: "host_not_authorized" as const };
  if (input.nowMs - input.startedAtMs > STATIC_1_LIMITS.runTimeoutMs) return { allowed: false, reason: "time_budget_exhausted" as const };
  return { allowed: true, reason: "allowed" as const };
}

export class Static1Budget {
  private httpRequests = 0;
  private htmlPages = 0;
  private concurrentRequests = 0;

  reserveHtmlPage() {
    if (this.htmlPages >= STATIC_1_LIMITS.maxHtmlPages) return false;
    this.htmlPages += 1;
    return true;
  }

  reserveRequest() {
    if (this.httpRequests >= STATIC_1_LIMITS.maxHttpRequests) return false;
    if (this.concurrentRequests >= STATIC_1_LIMITS.maxConcurrentRequestsPerSite) return false;
    this.httpRequests += 1;
    this.concurrentRequests += 1;
    return true;
  }

  releaseRequest() {
    this.concurrentRequests = Math.max(0, this.concurrentRequests - 1);
  }

  snapshot() {
    return { httpRequests: this.httpRequests, htmlPages: this.htmlPages, concurrentRequests: this.concurrentRequests };
  }
}
