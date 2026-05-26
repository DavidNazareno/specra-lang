import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const core = await import("../packages/core/dist/index.js");
const ir = await import("../packages/ir/dist/index.js");
const aiContext = await import("../packages/ai-context/dist/index.js");
const verifier = await import("../packages/verifier/dist/index.js");
const verifierTypeScript = await import(
  "../packages/verifier-typescript/dist/index.js"
);

async function readFixture(name) {
  return readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

test("valid fixture parses and validates", async () => {
  const source = await readFixture("booking-valid.scl");
  const document = core.parseDocument(source);
  const issues = core.validateDocument(document);

  assert.equal(document.expectations.length, 2);
  assert.deepEqual(issues, []);
});

test("invalid fixture fails with a syntax error", async () => {
  const source = await readFixture("booking-invalid.scl");

  await assert.rejects(async () => {
    core.parseDocument(source);
  }, /invalid auth mode/);
});

test("normalized model produces verification plan and AI context", async () => {
  const source = await readFixture("booking-valid.scl");
  const document = core.parseDocument(source);
  const model = ir.normalizeDocument(document);
  const plan = ir.createVerificationPlan(model);
  const context = aiContext.createAiContext(model);
  const brief = aiContext.renderAiImplementationBrief(model);

  assert.equal(plan.length, 2);
  assert.equal(context.operations[0].name, "createReservation");
  assert.match(brief, /Rules for the implementing agent/);
});

test("verifier compares observed results against expectations", async () => {
  const source = await readFixture("booking-valid.scl");
  const model = ir.normalizeDocument(core.parseDocument(source));

  const report = verifier.verifyObservedResults(model, [
    {
      expectation: "createReservation_success",
      outcome: "success",
      output: {
        status: "pending",
      },
    },
    {
      expectation: "createReservation_requires_auth",
      outcome: "unauthorized",
    },
  ]);

  assert.equal(report.summary.failed, 0);
  assert.equal(report.summary.passed, 2);
});

test("typescript verifier extracts observed results from implementation snapshot", async () => {
  const source = await readFixture("booking-valid.scl");
  const snapshotRaw = await readFixture(
    "typescript-implementation-snapshot.json",
  );
  const model = ir.normalizeDocument(core.parseDocument(source));
  const snapshot = JSON.parse(snapshotRaw);

  const extraction = verifierTypeScript.extractObservedResultsFromSnapshot(
    model,
    snapshot,
  );

  assert.equal(extraction.observedResults.length, 2);
  assert.deepEqual(extraction.warnings, []);
});
