import { STATIC_1_LIMITS, Static1Budget, isBlockedIpv4, normalizeAuthorizedHost } from "./safety.ts";

export type AllowedMethod = "GET" | "HEAD" | "OPTIONS";

export type HttpTransport = {
  request(input: { url: string; method: AllowedMethod; timeoutMs: number }): Promise<{
    status: number;
    headers?: Record<string, string>;
    body?: string;
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
  | { allowed: false; reason: "method_not_allowed" | "invalid_url" | "destination_blocked" | "host_not_authorized" | "port_not_allowed" | "request_budget_exhausted" };

export class ControlledEgress {
  private readonly authorizedHosts: string[];
  private readonly transport: HttpTransport;
  private readonly budget: Static1Budget;
  private readonly rateScheduler: RateScheduler;
  private nextRequestAtMs = 0;

  constructor(
    authorizedHosts: string[],
    transport: HttpTransport,
    budget = new Static1Budget(),
    rateScheduler: RateScheduler = systemRateScheduler
  ) {
    this.authorizedHosts = authorizedHosts;
    this.transport = transport;
    this.budget = budget;
    this.rateScheduler = rateScheduler;
  }

  private async waitForRateLimit() {
    const now = this.rateScheduler.now();
    const requestAt = Math.max(now, this.nextRequestAtMs);
    this.nextRequestAtMs = requestAt + 1_000;
    if (requestAt > now) await this.rateScheduler.wait(requestAt - now);
  }

  async request(urlValue: string, method: string): Promise<EgressResult> {
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
    if (!host || isBlockedIpv4(url.hostname)) return { allowed: false, reason: "destination_blocked" };
    const authorized = this.authorizedHosts.map(normalizeAuthorizedHost).filter(Boolean);
    if (!authorized.includes(host)) return { allowed: false, reason: "host_not_authorized" };
    await this.waitForRateLimit();
    if (!this.budget.reserveRequest()) return { allowed: false, reason: "request_budget_exhausted" };

    try {
      const response = await this.transport.request({ url: url.toString(), method, timeoutMs: STATIC_1_LIMITS.httpTimeoutMs });
      return { allowed: true, status: response.status, headers: response.headers ?? {}, body: response.body ?? "" };
    } finally {
      this.budget.releaseRequest();
    }
  }
}
