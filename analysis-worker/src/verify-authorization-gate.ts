import assert from "node:assert/strict";
import { canStartAuthorizedAnalysis } from "./authorization-gate.ts";

const approvedStatic1 = {
  status: "approved" as const,
  profileId: "STATIC-1",
  profileVersion: "1",
  approvedAt: "2026-10-23T12:00:00Z"
};

const cases = [
  { name: "DNS pendiente aunque exista autorización", expected: "verification_not_valid", input: { requestedProfile: "STATIC-1" as const, requestedProfileVersion: "1", hostVerificationStatus: "pending" as const, authorization: approvedStatic1 } },
  { name: "DNS verificado sin autorización", expected: "authorization_missing", input: { requestedProfile: "STATIC-1" as const, requestedProfileVersion: "1", hostVerificationStatus: "verified" as const, authorization: null } },
  { name: "Autorización todavía pendiente", expected: "authorization_not_approved", input: { requestedProfile: "STATIC-1" as const, requestedProfileVersion: "1", hostVerificationStatus: "verified" as const, authorization: { ...approvedStatic1, status: "pending" as const, approvedAt: undefined } } },
  { name: "Versión de perfil distinta", expected: "authorization_profile_mismatch", input: { requestedProfile: "STATIC-1" as const, requestedProfileVersion: "2", hostVerificationStatus: "verified" as const, authorization: approvedStatic1 } },
  { name: "DNS y autorización válidos", expected: "allowed", input: { requestedProfile: "STATIC-1" as const, requestedProfileVersion: "1", hostVerificationStatus: "verified" as const, authorization: approvedStatic1 } }
];

const results = cases.map((testCase) => {
  const actual = canStartAuthorizedAnalysis(testCase.input);
  const received = actual.allowed ? "allowed" : actual.reason;
  assert.equal(received, testCase.expected, testCase.name);
  return { caso: testCase.name, esperado: testCase.expected, obtenido: received, permite_analisis: actual.allowed ? "sí" : "no" };
});

console.table(results);

console.log("Correctas: compuerta de autorización STATIC-1.");
