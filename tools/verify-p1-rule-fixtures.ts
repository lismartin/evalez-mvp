import assert from "node:assert/strict";
import { p1Fixtures } from "../src/lib/rules/p1.fixtures.ts";

for (const fixture of p1Fixtures) {
  assert.equal(fixture.actual, fixture.expected, fixture.name);
}

console.log(`Correctas: ${p1Fixtures.length} fixtures de reglas P1.`);
