import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { HttpTransport } from "./controlled-egress.ts";

export class NodeTransport implements HttpTransport {
  private readonly contactUrl: string;

  constructor(contactUrl: string) {
    this.contactUrl = contactUrl;
  }

  request(input: Parameters<HttpTransport["request"]>[0]) {
    const url = new URL(input.url);
    const requestWithProtocol = url.protocol === "https:" ? httpsRequest : httpRequest;

    return new Promise<Awaited<ReturnType<HttpTransport["request"]>>>((resolve, reject) => {
      let settled = false;
      const finish = (result: Awaited<ReturnType<HttpTransport["request"]>>) => {
        if (settled) return;
        settled = true;
        clearTimeout(totalTimeout);
        resolve(result);
      };
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(totalTimeout);
        reject(error);
      };
      const request = requestWithProtocol({
        protocol: url.protocol,
        agent: false,
        hostname: input.destination.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: input.method,
        servername: input.destination.hostname,
        headers: {
          Host: input.destination.hostname,
          "Accept-Encoding": "identity",
          "User-Agent": `evalez-bot/0.1 (+${this.contactUrl})`
        },
        lookup: (_hostname, options, callback) => {
          const done = typeof options === "function" ? options : callback;
          if (typeof options === "object" && options.all) {
            done(null, [{ address: input.destination.address, family: input.destination.family }]);
            return;
          }
          done(null, input.destination.address, input.destination.family);
        }
      }, (response) => {
        const chunks: Buffer[] = [];
        let bodyBytes = 0;
        let truncated = false;
        response.on("data", (chunk: Buffer) => {
          const remaining = input.maxBodyBytes - bodyBytes;
          if (remaining > 0) {
            const accepted = chunk.subarray(0, remaining);
            chunks.push(accepted);
            bodyBytes += accepted.length;
          }
          if (chunk.length > remaining) {
            truncated = true;
            response.destroy();
          }
        });
        response.on("end", () => finish({
          status: response.statusCode ?? 0,
          headers: Object.fromEntries(Object.entries(response.headers).flatMap(([key, value]) => value === undefined ? [] : [[key, Array.isArray(value) ? value.join(", ") : value]])),
          body: Buffer.concat(chunks).toString("utf8"),
          truncated
        }));
        response.on("close", () => {
          if (truncated) finish({
            status: response.statusCode ?? 0,
            headers: Object.fromEntries(Object.entries(response.headers).flatMap(([key, value]) => value === undefined ? [] : [[key, Array.isArray(value) ? value.join(", ") : value]])),
            body: Buffer.concat(chunks).toString("utf8"),
            truncated: true
          });
        });
        response.on("error", fail);
      });
      const totalTimeout = setTimeout(() => request.destroy(new Error("HTTP request timed out")), input.timeoutMs);
      request.on("error", fail);
      request.end();
    });
  }
}
