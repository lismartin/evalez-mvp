import { checkServerIdentity, connect, type ConnectionOptions, type TLSSocket } from "node:tls";
import { resolveDestination, type ResolveDestinationResult } from "./resolve-destination.ts";

export type TlsConnectionReservation = { reserveTlsConnection(): boolean };

export class TlsConnectionBudget implements TlsConnectionReservation {
  private used = 0;
  private readonly maximum: number;

  constructor(maximum = 40) {
    this.maximum = maximum;
  }

  reserveTlsConnection() {
    if (this.used >= this.maximum) return false;
    this.used += 1;
    return true;
  }
}

export type TlsProbeResult = {
  protocol: "https";
  certificate?: {
    validForHost: boolean;
    chainTrusted: boolean;
    expiresAt: string;
    validFrom?: string;
  };
  failure?: "destination_blocked" | "dns_unavailable" | "tls_budget_exhausted" | "timeout" | "connection";
};

export type NodeTlsProbeOptions = {
  resolve?: (hostname: string) => Promise<ResolveDestinationResult>;
  budget?: TlsConnectionReservation;
  port?: number;
  timeoutMs?: number;
  ca?: ConnectionOptions["ca"];
};

function isoDate(value: string) {
  return new Date(value).toISOString();
}

function failureForResolution(reason: "dns_no_answer" | "dns_unavailable" | "destination_blocked" | "dns_budget_exhausted") {
  return reason === "destination_blocked" ? "destination_blocked" : "dns_unavailable" as const;
}

export function createNodeTlsProbe(options: NodeTlsProbeOptions = {}) {
  const resolveDestinationForProbe = options.resolve ?? resolveDestination;
  const budget = options.budget ?? new TlsConnectionBudget();
  const port = options.port ?? 443;
  const timeoutMs = options.timeoutMs ?? 15_000;

  return {
    async inspect(hostname: string, _observedAt: string): Promise<TlsProbeResult> {
      const resolution = await resolveDestinationForProbe(hostname);
      if (!resolution.ok) return { protocol: "https", failure: failureForResolution(resolution.reason) };
      if (!budget.reserveTlsConnection()) return { protocol: "https", failure: "tls_budget_exhausted" };

      return new Promise<TlsProbeResult>((resolve) => {
        let settled = false;
        const finish = (result: TlsProbeResult) => {
          if (settled) return;
          settled = true;
          socket.destroy();
          resolve(result);
        };
        const socket: TLSSocket = connect({
          host: resolution.destination.address,
          port,
          servername: hostname,
          rejectUnauthorized: false,
          timeout: timeoutMs,
          ca: options.ca
        });

        socket.once("secureConnect", () => {
          const certificate = socket.getPeerCertificate();
          if (!certificate || !certificate.valid_to || !certificate.valid_from) return finish({ protocol: "https", failure: "connection" });
          finish({
            protocol: "https",
            certificate: {
              validForHost: checkServerIdentity(hostname, certificate) === undefined,
              chainTrusted: socket.authorized,
              expiresAt: isoDate(certificate.valid_to),
              validFrom: isoDate(certificate.valid_from)
            }
          });
        });
        socket.once("timeout", () => finish({ protocol: "https", failure: "timeout" }));
        socket.once("error", () => finish({ protocol: "https", failure: "connection" }));
      });
    }
  };
}
