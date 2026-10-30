import assert from "node:assert/strict";
import { createServer as createTcpServer } from "node:net";
import type { Socket } from "node:net";
import { createServer } from "node:tls";
import selfsigned from "selfsigned";
import { TlsConnectionBudget, createNodeTlsProbe } from "./tls-probe.ts";

const now = new Date(Math.floor(Date.now() / 1_000) * 1_000);
const past = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
const future = new Date(now.getTime() + 24 * 60 * 60 * 1_000);

async function certificate(hostname: string, notBeforeDate = past, notAfterDate = future) {
  return selfsigned.generate([{ name: "commonName", value: hostname }], {
    algorithm: "sha256",
    notBeforeDate,
    notAfterDate,
    extensions: [{ name: "subjectAltName", altNames: [{ type: 2, value: hostname }] }]
  });
}

async function withTlsServer<T>(pems: Awaited<ReturnType<typeof certificate>>, run: (port: number, received: Array<Buffer | string>) => Promise<T>) {
  const received: Array<Buffer | string> = [];
  const server = createServer({ key: pems.private, cert: pems.cert }, (socket) => socket.on("data", (chunk) => received.push(chunk)));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("El servidor TLS local no expuso un puerto TCP.");

  try {
    return await run(address.port, received);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

const localResolution = async (hostname: string) => ({ ok: true as const, destination: { hostname, address: "127.0.0.1", family: 4 as const } });
const observedAt = "2026-10-30T12:00:00.000Z";

const validPems = await certificate("valid.example.test");
await withTlsServer(validPems, async (port, received) => {
  const probe = createNodeTlsProbe({ resolve: localResolution, port, ca: validPems.cert });
  const result = await probe.inspect("valid.example.test", observedAt);
  assert.ok(result.certificate, `El handshake debe exponer un certificado: ${JSON.stringify(result)}`);
  assert.deepEqual(result.certificate && {
    validForHost: result.certificate.validForHost,
    chainTrusted: result.certificate.chainTrusted,
    expiresAt: result.certificate.expiresAt,
    validFrom: result.certificate.validFrom
  }, {
    validForHost: true,
    chainTrusted: true,
    expiresAt: future.toISOString(),
    validFrom: past.toISOString()
  }, "Un certificado válido y confiable conserva sus fechas.");
  assert.equal(received.length, 0, "El sondeo no envía datos de aplicación tras el handshake.");
});

await withTlsServer(await certificate("other.example.test"), async (port) => {
  const probe = createNodeTlsProbe({ resolve: localResolution, port });
  const result = await probe.inspect("valid.example.test", observedAt);
  assert.equal(result.certificate?.validForHost, false, "El SNI se valida frente al certificado recibido.");
  assert.equal(result.certificate?.chainTrusted, false, "Un certificado autofirmado no es confiable.");
});

await withTlsServer(await certificate("valid.example.test", new Date(now.getTime() - 48 * 60 * 60 * 1_000), past), async (port) => {
  const result = await createNodeTlsProbe({ resolve: localResolution, port }).inspect("valid.example.test", observedAt);
  assert.equal(result.certificate?.expiresAt, past.toISOString(), "Un certificado vencido informa su vencimiento.");
  assert.equal(result.certificate?.chainTrusted, false, "Un certificado vencido no forma una cadena confiable.");
});

await withTlsServer(await certificate("valid.example.test", future, new Date(future.getTime() + 24 * 60 * 60 * 1_000)), async (port) => {
  const result = await createNodeTlsProbe({ resolve: localResolution, port }).inspect("valid.example.test", observedAt);
  assert.equal(result.certificate?.validFrom, future.toISOString(), "Un certificado todavía no válido informa su inicio.");
  assert.equal(result.certificate?.chainTrusted, false, "Un certificado futuro no forma una cadena confiable.");
});

assert.deepEqual(await createNodeTlsProbe({ resolve: async () => ({ ok: false as const, reason: "destination_blocked" }) }).inspect("blocked.example.test", observedAt), {
  protocol: "https", failure: "destination_blocked"
}, "Un destino bloqueado no abre una conexión TLS.");

const exhausted = new TlsConnectionBudget(0);
assert.deepEqual(await createNodeTlsProbe({ resolve: localResolution, budget: exhausted }).inspect("valid.example.test", observedAt), {
  protocol: "https", failure: "tls_budget_exhausted"
}, "El presupuesto agotado impide abrir una conexión TLS.");

const stalledSockets = new Set<Socket>();
const stalledServer = createTcpServer((socket) => {
  stalledSockets.add(socket);
  socket.once("close", () => stalledSockets.delete(socket));
});
await new Promise<void>((resolve) => stalledServer.listen(0, "127.0.0.1", resolve));
const stalledAddress = stalledServer.address();
if (!stalledAddress || typeof stalledAddress === "string") throw new Error("El servidor TCP local no expuso un puerto.");
try {
  assert.deepEqual(await createNodeTlsProbe({ resolve: localResolution, port: stalledAddress.port, timeoutMs: 25 }).inspect("valid.example.test", observedAt), {
    protocol: "https", failure: "timeout"
  }, "Una conexión que no completa el handshake expira sin certificado.");
} finally {
  for (const socket of stalledSockets) socket.destroy();
  await new Promise<void>((resolve, reject) => stalledServer.close((error) => error ? reject(error) : resolve()));
}

const closedServer = createTcpServer();
await new Promise<void>((resolve) => closedServer.listen(0, "127.0.0.1", resolve));
const closedAddress = closedServer.address();
if (!closedAddress || typeof closedAddress === "string") throw new Error("El servidor TCP local no expuso un puerto.");
await new Promise<void>((resolve, reject) => closedServer.close((error) => error ? reject(error) : resolve()));
assert.deepEqual(await createNodeTlsProbe({ resolve: localResolution, port: closedAddress.port, timeoutMs: 100 }).inspect("valid.example.test", observedAt), {
  protocol: "https", failure: "connection"
}, "Un puerto cerrado informa error de conexión sin certificado.");

console.log("Correctas: sondeo TLS con certificado, resolución validada, presupuesto, timeout, conexión y sin datos de aplicación.");
