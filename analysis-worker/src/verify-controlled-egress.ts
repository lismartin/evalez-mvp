import assert from "node:assert/strict";
import { ControlledEgress, type HttpTransport } from "./controlled-egress.ts";

const calls: { url: string; method: string; timeoutMs: number }[] = [];
const transport: HttpTransport = {
  request: async (input) => {
    calls.push(input);
    return { status: 200 };
  }
};

const egress = new ControlledEgress(["www.tusitio.ch"], transport);
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
console.table(rows);
console.log("Correctas: salida de red controlada.");
