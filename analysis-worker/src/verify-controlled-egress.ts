import assert from "node:assert/strict";
import { ControlledEgress, type HttpTransport } from "./controlled-egress.ts";
import type { DestinationResolver } from "./resolve-destination.ts";

const calls: { url: string; method: string; timeoutMs: number; destination: { hostname: string; address: string; family: 4 | 6 }; maxBodyBytes: number }[] = [];
const transport: HttpTransport = {
  request: async (input) => {
    calls.push(input);
    return { status: 200 };
  }
};

const publicResolver: DestinationResolver = { lookupAll: async () => [{ address: "8.8.8.8", family: 4 }] };
const egress = new ControlledEgress(["www.tusitio.ch"], transport, undefined, undefined, { resolver: publicResolver });
const cases = [
  { name: "GET al host autorizado", result: await egress.request("https://www.tusitio.ch/servicios", "GET"), expected: "allowed" },
  { name: "POST bloqueado", result: await egress.request("https://www.tusitio.ch/formulario", "POST"), expected: "method_not_allowed" },
  { name: "Host externo bloqueado", result: await egress.request("https://externo.example/", "GET"), expected: "host_not_authorized" },
  { name: "IP privada bloqueada", result: await egress.request("http://192.168.1.1/", "GET"), expected: "destination_blocked" },
  { name: "Puerto no permitido bloqueado", result: await egress.request("https://www.tusitio.ch:8080/", "GET"), expected: "port_not_allowed" }
];

const rows = cases.map((testCase) => {
  const received = testCase.result.allowed ? "allowed" : testCase.result.reason;
  assert.equal(received, testCase.expected, testCase.name);
  return { caso: testCase.name, esperado: testCase.expected, obtenido: received };
});
assert.equal(calls.length, 1, "Solo la solicitud autorizada puede llegar al transporte simulado.");
assert.equal(calls[0].timeoutMs, 15_000, "La solicitud autorizada recibe el tiempo de espera STATIC-1.");
assert.deepEqual(calls[0].destination, { hostname: "www.tusitio.ch", address: "8.8.8.8", family: 4 });
assert.equal(calls[0].maxBodyBytes, 2 * 1024 * 1024);

for (const [name, address] of [["loopback", "127.0.0.1"], ["metadatos", "169.254.169.254"], ["IPv6 loopback", "::1"]] as const) {
  const blocked = new ControlledEgress(["www.tusitio.ch"], transport, undefined, undefined, {
    resolver: { lookupAll: async () => [{ address, family: address.includes(":") ? 6 : 4 }] }
  });
  const result = await blocked.request("https://www.tusitio.ch/", "GET");
  assert.deepEqual(result, { allowed: false, reason: "destination_blocked" }, `${name} no puede tocar el transporte.`);
}

const mixed = new ControlledEgress(["www.tusitio.ch"], transport, undefined, undefined, {
  resolver: { lookupAll: async () => [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }] }
});
assert.deepEqual(await mixed.request("https://www.tusitio.ch/", "GET"), { allowed: false, reason: "destination_blocked" });

let resolveCall = 0;
const changingDestination = new ControlledEgress(["www.tusitio.ch"], transport, undefined, { now: () => 0, wait: async () => {} }, {
  resolver: { lookupAll: async () => [{ address: resolveCall++ === 0 ? "8.8.8.8" : "127.0.0.1", family: 4 }] }
});
assert.equal((await changingDestination.request("https://www.tusitio.ch/primera", "GET")).allowed, true);
assert.deepEqual(await changingDestination.request("https://www.tusitio.ch/segunda", "GET"), { allowed: false, reason: "destination_blocked" });

const revoked = new ControlledEgress(["www.tusitio.ch"], transport, undefined, undefined, {
  resolver: publicResolver,
  beforeRequest: async () => false
});
assert.deepEqual(await revoked.request("https://www.tusitio.ch/", "GET"), { allowed: false, reason: "authorization_revoked" });

let responseStatus = 429;
const stoppableTransport: HttpTransport = { request: async () => ({ status: responseStatus }) };
const rateLimited = new ControlledEgress(["www.tusitio.ch"], stoppableTransport, undefined, undefined, { resolver: publicResolver });
assert.equal((await rateLimited.request("https://www.tusitio.ch/", "GET")).allowed, true);
assert.deepEqual(await rateLimited.request("https://www.tusitio.ch/otra", "GET"), { allowed: false, reason: "rate_limited" });

responseStatus = 500;
const serverErrors = new ControlledEgress(["www.tusitio.ch"], stoppableTransport, undefined, undefined, { resolver: publicResolver });
for (let index = 0; index < 5; index += 1) assert.equal((await serverErrors.request(`https://www.tusitio.ch/${index}`, "GET")).allowed, true);
assert.deepEqual(await serverErrors.request("https://www.tusitio.ch/detenida", "GET"), { allowed: false, reason: "too_many_server_errors" });
console.table(rows);
console.log("Correctas: salida de red controlada.");
