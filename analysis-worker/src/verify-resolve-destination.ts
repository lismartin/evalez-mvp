import assert from "node:assert/strict";
import { resolveDestination, type DestinationResolver } from "./resolve-destination.ts";

let queries = 0;
const counter = { reserveDnsQuery: () => { queries += 1; return true; } };
const publicResolver: DestinationResolver = { lookupAll: async () => [{ address: "8.8.8.8", family: 4 }] };

assert.deepEqual(await resolveDestination("example.com", publicResolver, counter), {
  ok: true,
  destination: { hostname: "example.com", address: "8.8.8.8", family: 4 }
});
assert.equal(queries, 1);

const mixedResolver: DestinationResolver = { lookupAll: async () => [
  { address: "8.8.8.8", family: 4 }, { address: "10.0.0.1", family: 4 }
] };
assert.deepEqual(await resolveDestination("example.com", mixedResolver, counter), { ok: false, reason: "destination_blocked" });

const emptyResolver: DestinationResolver = { lookupAll: async () => [] };
assert.deepEqual(await resolveDestination("example.com", emptyResolver, counter), { ok: false, reason: "dns_no_answer" });

const failingResolver: DestinationResolver = { lookupAll: async () => { throw new Error("temporary DNS failure"); } };
assert.deepEqual(await resolveDestination("example.com", failingResolver, counter), { ok: false, reason: "dns_unavailable" });

const exhaustedCounter = { reserveDnsQuery: () => false };
assert.deepEqual(await resolveDestination("example.com", publicResolver, exhaustedCounter), { ok: false, reason: "dns_budget_exhausted" });

console.log("Correctas: resolución DNS validada sin consultas reales.");
