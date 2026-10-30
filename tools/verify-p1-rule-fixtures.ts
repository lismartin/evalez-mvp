import assert from "node:assert/strict";
import { detailedP1Fixtures, p1Fixtures } from "../src/lib/rules/p1.fixtures.ts";

for (const fixture of p1Fixtures) {
  assert.equal(fixture.actual, fixture.expected, fixture.name);
}

for (const fixture of detailedP1Fixtures) {
  for (const [field, expected] of Object.entries(fixture.expected)) {
    assert.equal((fixture.actual as Record<string, unknown>)[field], expected, `${fixture.name}: ${field}`);
  }
}

console.log(`Correctas: ${p1Fixtures.length + detailedP1Fixtures.length} fixtures de reglas P1.`);
