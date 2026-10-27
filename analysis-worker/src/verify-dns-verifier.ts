import assert from "node:assert/strict";
import { verifyDnsTxtChallenge, type DnsTxtResolver } from "./dns-verifier.ts";

const now = new Date("2026-10-23T12:00:00Z");
const baseChallenge = {
  recordName: "_evalez-verification.www.tusitio.ch",
  tokenValue: "evalez-verification=token-controlado",
  status: "pending" as const,
  expiresAt: "2026-10-30T12:00:00Z"
};

const matchingResolver: DnsTxtResolver = { lookupTxt: async () => [["evalez-verification=token-controlado"]] };
const splitTokenResolver: DnsTxtResolver = { lookupTxt: async () => [["evalez-verification=", "token-controlado"]] };
const mismatchResolver: DnsTxtResolver = { lookupTxt: async () => [["otro-valor"]] };
const unavailableResolver: DnsTxtResolver = { lookupTxt: async () => { throw new Error("dns temporalmente no disponible"); } };

assert.equal((await verifyDnsTxtChallenge(baseChallenge, matchingResolver, now)).status, "verified");
assert.equal((await verifyDnsTxtChallenge(baseChallenge, splitTokenResolver, now)).status, "verified");
assert.equal((await verifyDnsTxtChallenge(baseChallenge, mismatchResolver, now)).reason, "token_not_found");
assert.equal((await verifyDnsTxtChallenge(baseChallenge, unavailableResolver, now)).reason, "resolver_unavailable");
assert.equal((await verifyDnsTxtChallenge({ ...baseChallenge, expiresAt: "2026-10-22T12:00:00Z" }, matchingResolver, now)).status, "expired");
assert.equal((await verifyDnsTxtChallenge({ ...baseChallenge, status: "verified" }, matchingResolver, now)).status, "unchanged");

console.log("Correctas: verificación DNS controlada.");
