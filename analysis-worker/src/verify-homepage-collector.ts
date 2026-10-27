import assert from "node:assert/strict";
import { ControlledEgress, type HttpTransport } from "./controlled-egress.ts";
import { collectHomepage } from "./homepage-collector.ts";

const calls: string[] = [];
const transport: HttpTransport = {
  async request(input) {
    calls.push(input.url);
    return {
      status: 200,
      headers: { "x-robots-tag": "all" },
      body: '<html><head><meta name="robots" content="index, noindex"></head><body><a href="/servicios">Servicios</a><a href="https://www.tusitio.ch/contacto">Contacto</a><a href="https://externo.example/">Externo</a></body></html>'
    };
  }
};

const collection = await collectHomepage(new ControlledEgress(["www.tusitio.ch"], transport), "www.tusitio.ch");
assert.equal(collection.collected, true);
if (!collection.collected) throw new Error("La portada simulada debería poder recolectarse.");

const actual = {
  status: collection.observation.status,
  noindex: collection.observation.effectiveNoindex,
  internalLinks: collection.observation.internalLinkPaths,
  transportCalls: calls.length
};
const expected = { status: 200, noindex: true, internalLinks: ["/contacto", "/servicios"], transportCalls: 1 };
console.table([{ caso: "Recolector de portada controlado", esperado: JSON.stringify(expected), obtenido: JSON.stringify(actual) }]);
assert.deepEqual(actual, expected);
console.log("Correctas: recolección HTML controlada sin destinos externos.");
