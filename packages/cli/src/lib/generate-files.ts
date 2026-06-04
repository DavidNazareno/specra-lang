import { createAiContext } from "@specra/ai-context";
import type { parseDocument } from "@specra/core";
import { createVerificationPlan, normalizeDocument } from "@specra/ir";
import type { ObservedExpectationResult } from "@specra/verifier";
import type { createSnapshotTemplate } from "@specra/verifier-typescript";

import type { GeneratedFile } from "../types.js";
import { contextFileName, planFileName } from "../config.js";

export interface RuntimeArtifacts {
  ctx: string;
  plan: string;
}

export interface CompactObservedResult {
  n: string;
  o: string;
  y?: Record<string, unknown>;
  z?: string[];
}

export function createRuntimeArtifacts(
  document: ReturnType<typeof parseDocument>,
): RuntimeArtifacts {
  const model = normalizeDocument(document);
  const verificationPlan = createVerificationPlan(model);
  const ctx = createCompactContext(model);
  const plan = verificationPlan.map((expectation) => ({
    n: expectation.expectation,
    o: expectation.operation,
    a: expectation.auth,
    i: expectation.input,
    r: expectation.assertions.map((assertion) => [
      assertion.target,
      assertion.value,
    ]),
  }));

  return {
    ctx: `${JSON.stringify(ctx)}\n`,
    plan: `${JSON.stringify(plan)}\n`,
  };
}

export function createRefreshFiles(
  document: ReturnType<typeof parseDocument>,
): GeneratedFile[] {
  const artifacts = createRuntimeArtifacts(document);
  return [
    {
      path: contextFileName,
      content: artifacts.ctx,
    },
    {
      path: planFileName,
      content: artifacts.plan,
    },
  ];
}

export function createObservedResultsTemplate(
  snapshot: ReturnType<typeof createSnapshotTemplate>,
) {
  return encodeObservedResults(
    snapshot.expectations.map((expectation) => ({
      expectation: expectation.expectation,
      outcome: expectation.outcome,
      output: expectation.output,
    })),
  );
}

export function encodeObservedResults(
  observedResults: ObservedExpectationResult[],
): CompactObservedResult[] {
  return observedResults.map((result) => ({
    n: result.expectation,
    o: result.outcome,
    ...(result.output ? { y: result.output } : {}),
    ...(result.notes?.length ? { z: result.notes } : {}),
  }));
}

export function decodeObservedResults(
  payload: unknown,
): ObservedExpectationResult[] {
  if (!Array.isArray(payload)) {
    throw new Error("Observed results must be a JSON array.");
  }

  return payload.map((entry) => {
    if (
      entry &&
      typeof entry === "object" &&
      "expectation" in entry &&
      "outcome" in entry
    ) {
      const legacy = entry as ObservedExpectationResult;
      return {
        expectation: legacy.expectation,
        outcome: legacy.outcome,
        ...(legacy.output ? { output: legacy.output } : {}),
        ...(legacy.notes ? { notes: legacy.notes } : {}),
      };
    }

    if (entry && typeof entry === "object" && "n" in entry && "o" in entry) {
      const compact = entry as CompactObservedResult;
      return {
        expectation: compact.n,
        outcome: compact.o,
        ...(compact.y ? { output: compact.y } : {}),
        ...(compact.z ? { notes: compact.z } : {}),
      };
    }

    throw new Error("Observed results contain an invalid entry.");
  });
}

function createCompactContext(model: ReturnType<typeof normalizeDocument>) {
  return {
    s: model.service,
    g: model.goal,
    e: model.entities.map((entity) => ({
      n: entity.name,
      f: entity.fields.map((field) => [field.name, field.type]),
    })),
    o: model.operations.map((operation) => ({
      n: operation.name,
      i: operation.input,
      o: operation.output,
    })),
    c: model.constraints,
    t: model.target,
    x: model.expectations.map((expectation) => ({
      n: expectation.name,
      o: expectation.operation,
      a: expectation.auth,
      r: expectation.assertions.map((assertion) => [
        assertion.target,
        assertion.value,
      ]),
    })),
  };
}
