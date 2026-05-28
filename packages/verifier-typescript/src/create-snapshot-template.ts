import type { ScalarValue } from "@specra/ast";
import type { SpecraModel } from "@specra/ir";

import type { TypeScriptImplementationSnapshot } from "./types.js";

export function createSnapshotTemplate(
  model: SpecraModel,
): TypeScriptImplementationSnapshot {
  return {
    service: model.service ?? undefined,
    operations: model.operations.map((operation) => ({
      name: operation.name,
      implemented: false,
    })),
    expectations: model.expectations.map((expectation) => ({
      expectation: expectation.name,
      operation: expectation.operation ?? undefined,
      outcome: deriveSuggestedOutcome(expectation.assertions),
      output: createSuggestedOutput(expectation.assertions),
    })),
  };
}

function deriveSuggestedOutcome(
  assertions: Array<{ target: string; value: ScalarValue }>,
): string {
  const outcomeAssertion = assertions.find(
    (assertion) => assertion.target === "outcome",
  );
  return typeof outcomeAssertion?.value === "string"
    ? outcomeAssertion.value
    : "success";
}

function createSuggestedOutput(
  assertions: Array<{ target: string; value: ScalarValue }>,
): Record<string, unknown> | undefined {
  const outputAssertions = assertions.filter((assertion) =>
    assertion.target.startsWith("output."),
  );
  if (outputAssertions.length === 0) {
    return undefined;
  }

  const output: Record<string, unknown> = {};

  for (const assertion of outputAssertions) {
    const path = assertion.target.slice("output.".length).split(".");
    assignPath(output, path, assertion.value);
  }

  return output;
}

function assignPath(
  target: Record<string, unknown>,
  path: string[],
  value: ScalarValue,
): void {
  let current: Record<string, unknown> = target;

  for (const segment of path.slice(0, -1)) {
    const next = current[segment];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  const lastSegment = path[path.length - 1];
  if (lastSegment) {
    current[lastSegment] = value;
  }
}
