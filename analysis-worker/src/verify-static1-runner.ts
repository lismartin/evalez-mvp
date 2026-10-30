import assert from "node:assert/strict";
import { ControlledEgress, type HttpTransport, type RateScheduler } from "./controlled-egress.ts";
import { runOneStatic1Analysis } from "./static1-runner.ts";

let clock = 0;
const waits: number[] = [];
const scheduler: RateScheduler = {
  now: () => clock,
  wait: async (milliseconds) => { waits.push(milliseconds); clock += milliseconds; }
};
const transport: HttpTransport = {
  async request(input) {
    if (input.url.endsWith("/archivo")) return { status: 404, body: "" };
    return { status: 200, body: '<meta name="robots" content="noindex"><a href="/archivo">Archivo</a>' };
  }
};
let persisted: { executions: number; findings: number; status: string } | null = null;

const result = await runOneStatic1Analysis({
  reserveNextRun: async () => ({
    id: "run-1", organization_id: "org-1", website_id: "site-1", website_host_id: "host-1",
    profile_id: "STATIC-1", profile_version: "1", requested_by: "user-1", scheduled_at: "2026-10-27T15:00:00Z"
  }),
  loadTarget: async () => ({ hostname: "www.tusitio.ch", intendedIndexability: true }),
  egress: new ControlledEgress(["www.tusitio.ch"], transport, undefined, scheduler),
  tlsProbe: { inspect: async () => ({ protocol: "https", certificate: { validForHost: true, chainTrusted: true, expiresAt: "2027-10-27T15:00:00Z" } }) },
  persist: async (_context, processed) => {
    persisted = { executions: processed.ruleExecutions.length, findings: processed.findings.length, status: processed.coverage.blockedOrFailed || processed.coverage.skipped ? "partially_completed" : "completed" };
    return "completed";
  },
  now: () => "2026-10-27T15:00:00Z"
});

const actual = { processed: result.processed, status: result.processed ? result.status : null, persisted, waits };
const expected = { processed: true, status: "completed", persisted: { executions: 3, findings: 2, status: "completed" }, waits: [1000] };
console.table([{ caso: "Flujo STATIC-1 unificado", esperado: JSON.stringify(expected), obtenido: JSON.stringify(actual) }]);
assert.deepEqual(actual, expected);
console.log("Correctas: reserva, recolección, reglas y persistencia conectadas en un flujo controlado.");
