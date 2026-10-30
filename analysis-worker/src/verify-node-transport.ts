import assert from "node:assert/strict";
import { createServer } from "node:http";
import { NodeTransport } from "./node-transport.ts";

const server = createServer((request, response) => {
  if (request.url === "/redirect") {
    response.writeHead(302, { location: "/final" });
    response.end();
    return;
  }
  response.writeHead(200, { "content-type": "text/plain" });
  response.end("x".repeat(32));
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("El servidor local no expuso un puerto TCP.");

try {
  const transport = new NodeTransport("https://contacto.evalez.test");
  const destination = { hostname: "ejemplo.test", address: "127.0.0.1", family: 4 as const };
  const response = await transport.request({
    url: `http://ejemplo.test:${address.port}/redirect`, method: "GET", timeoutMs: 1_000, destination, maxBodyBytes: 8
  });
  assert.equal(response.status, 302, "No sigue redirecciones.");
  assert.equal(response.headers?.location, "/final");

  const body = await transport.request({
    url: `http://ejemplo.test:${address.port}/body`, method: "GET", timeoutMs: 1_000, destination, maxBodyBytes: 8
  });
  assert.equal(body.body, "x".repeat(8));
  assert.equal(body.truncated, true);
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

console.log("Correctas: transporte Node fijado a destino de prueba local.");
