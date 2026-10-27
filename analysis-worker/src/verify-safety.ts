import assert from "node:assert/strict";
import { STATIC_1_LIMITS, Static1Budget, canStartStatic1Job } from "./safety.ts";

const base = {
  authorizedHosts: ["www.tusitio.ch"],
  authorizationValid: true,
  startedAtMs: 0,
  nowMs: 1
};

assert.equal(canStartStatic1Job({ ...base, requestedHost: "www.tusitio.ch" }).allowed, true);
assert.equal(canStartStatic1Job({ ...base, requestedHost: "localhost" }).reason, "destination_blocked");
assert.equal(canStartStatic1Job({ ...base, requestedHost: "192.168.1.1" }).reason, "destination_blocked");
assert.equal(canStartStatic1Job({ ...base, requestedHost: "otro.tusitio.ch" }).reason, "host_not_authorized");
assert.equal(canStartStatic1Job({ ...base, requestedHost: "www.tusitio.ch", authorizationValid: false }).reason, "authorization_missing");

const budget = new Static1Budget();
for (let index = 0; index < STATIC_1_LIMITS.maxHtmlPages; index += 1) assert.equal(budget.reserveHtmlPage(), true);
assert.equal(budget.reserveHtmlPage(), false);
assert.equal(budget.reserveRequest(), true);
assert.equal(budget.reserveRequest(), true);
assert.equal(budget.reserveRequest(), false);
budget.releaseRequest();
assert.equal(budget.reserveRequest(), true);

console.log("Correctas: límites STATIC-1 y política de destino.");
