import { STATIC_1_LIMITS, Static1Budget, normalizeAuthorizedHost } from "./safety.ts";
import { resolveDestination, type DestinationResolver, type ResolvedDestination } from "./resolve-destination.ts";

export type AllowedMethod = "GET" | "HEAD" | "OPTIONS";

export type HttpTransport = {
  request(input: { url: string; method: AllowedMethod; timeoutMs: number; destination: ResolvedDestination; maxBodyBytes: number }): Promise<{
    status: number;
    headers?: Record<string, string>;
    body?: string;
    truncated?: boolean;
  }>;
};

export type RateScheduler = {
  now(): number;
  wait(milliseconds: number): Promise<void>;
};

const systemRateScheduler: RateScheduler = {
  now: () => Date.now(),
  wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
};

export type EgressResult =
  | { allowed: true; status: number; headers: Record<string, string>; body: string }
  | { allowed: false; reason: "method_not_allowed" | "invalid_url" | "destination_blocked" | "host_not_authorized" | "port_not_allowed" | "request_budget_exhausted" | "dns_unavailable" | "dns_no_answer" | "dns_budget_exhausted" | "authorization_revoked" | "rate_limited" | "too_many_server_errors" };

export type ControlledEgressOptions = {
  resolver?: DestinationResolver;
  beforeRequest?: () => Promise<boolean>;
};

const MAX_HTML_BODY_BYTES = 2 * 1024 * 1024;

export class ControlledEgress {
  private readonly authorizedHosts: string[];
  private readonly transport: HttpTransport;
  private readonly budget: Static1Budget;
  private readonly rateScheduler: RateScheduler;
  private readonly options: ControlledEgressOptions;
  private nextRequestAtMs = 0;
  private rateLimited = false;
  private consecutiveServerErrors = 0;

  constructor(
    authorizedHosts: string[],
    transport: HttpTransport,
    budget = new Static1Budget(),
    rateScheduler: RateScheduler = systemRateScheduler,
    options: ControlledEgressOptions = {}
  ) {
    this.authorizedHosts = authorizedHosts;
    this.transport = transport;
    this.budget = budget;
    this.rateScheduler = rateScheduler;
    this.options = options;
  }

  private async waitForRateLimit() {
    const now = this.rateScheduler.now();
    const requestAt = Math.max(now, this.nextRequestAtMs);
    this.nextRequestAtMs = requestAt + 1_000;
    if (requestAt > now) await this.rateScheduler.wait(requestAt - now);
  }

  async request(urlValue: string, method: string): Promise<EgressResult> {
    if (this.rateLimited) return { allowed: false, reason: "rate_limited" };
    if (this.consecutiveServerErrors >= 5) return { allowed: false, reason: "too_many_server_errors" };
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      return { allowed: false, reason: "method_not_allowed" };
    }

    let url: URL;
    try {
      url = new URL(urlValue);
    } catch {
      return { allowed: false, reason: "invalid_url" };
    }

    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
      return { allowed: false, reason: "invalid_url" };
    }
    if (url.port && url.port !== "80" && url.port !== "443") {
      return { allowed: false, reason: "port_not_allowed" };
    }

    const host = normalizeAuthorizedHost(url.hostname);
    if (!host) return { allowed: false, reason: "destination_blocked" };
    const authorized = this.authorizedHosts.map(normalizeAuthorizedHost).filter(Boolean);
    if (!authorized.includes(host)) return { allowed: false, reason: "host_not_authorized" };
    if (this.options.beforeRequest && !await this.options.beforeRequest()) return { allowed: false, reason: "authorization_revoked" };

    const resolution = await resolveDestination(host, this.options.resolver);
    if (!resolution.ok) return { allowed: false, reason: resolution.reason };

    await this.waitForRateLimit();
    if (this.rateLimited) return { allowed: false, reason: "rate_limited" };
    if (this.consecutiveServerErrors >= 5) return { allowed: false, reason: "too_many_server_errors" };
    if (!this.budget.reserveRequest()) return { allowed: false, reason: "request_budget_exhausted" };

    try {
      const response = await this.transport.request({
        url: url.toString(), method, timeoutMs: STATIC_1_LIMITS.httpTimeoutMs,
        destination: resolution.destination, maxBodyBytes: MAX_HTML_BODY_BYTES
      });
      if (response.status === 429) this.rateLimited = true;
      this.consecutiveServerErrors = response.status >= 500 && response.status <= 599 ? this.consecutiveServerErrors + 1 : 0;
      return { allowed: true, status: response.status, headers: response.headers ?? {}, body: response.body ?? "" };
    } finally {
      this.budget.releaseRequest();
    }
  }
}
