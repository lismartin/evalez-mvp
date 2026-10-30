import { lookup } from "node:dns/promises";
import { isBlockedAddress } from "./address-policy.ts";

export type DestinationAddress = { address: string; family: 4 | 6 };

export type DestinationResolver = {
  lookupAll(hostname: string): Promise<DestinationAddress[]>;
};

export type DnsQueryCounter = {
  reserveDnsQuery(): boolean;
};

export type ResolvedDestination = {
  hostname: string;
  address: string;
  family: 4 | 6;
};

export type ResolveDestinationResult =
  | { ok: true; destination: ResolvedDestination }
  | { ok: false; reason: "dns_no_answer" | "dns_unavailable" | "destination_blocked" | "dns_budget_exhausted" };

const nodeResolver: DestinationResolver = {
  lookupAll: (hostname) => lookup(hostname, { all: true, verbatim: true }) as Promise<DestinationAddress[]>
};

const unlimitedDnsQueries: DnsQueryCounter = { reserveDnsQuery: () => true };

export async function resolveDestination(
  hostname: string,
  resolver: DestinationResolver = nodeResolver,
  counter: DnsQueryCounter = unlimitedDnsQueries
): Promise<ResolveDestinationResult> {
  if (!counter.reserveDnsQuery()) return { ok: false, reason: "dns_budget_exhausted" };

  let answers: DestinationAddress[];
  try {
    answers = await resolver.lookupAll(hostname);
  } catch {
    return { ok: false, reason: "dns_unavailable" };
  }

  if (answers.length === 0) return { ok: false, reason: "dns_no_answer" };
  if (answers.some((answer) => (answer.family !== 4 && answer.family !== 6) || isBlockedAddress(answer.address))) {
    return { ok: false, reason: "destination_blocked" };
  }

  const answer = answers[0];
  return { ok: true, destination: { hostname, address: answer.address, family: answer.family } };
}
