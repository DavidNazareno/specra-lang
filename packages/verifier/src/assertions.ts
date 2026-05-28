import type { ScalarValue } from "@specra/ast";

import type { ObservedExpectationResult } from "./types.js";

export function compareAssertion(
  target: string,
  expectedValue: ScalarValue,
  observed: ObservedExpectationResult,
): string | null {
  if (target === "outcome") {
    return observed.outcome === expectedValue
      ? null
      : `Expected outcome "${String(expectedValue)}" but observed "${observed.outcome}".`;
  }

  if (target.startsWith("output.")) {
    const path = target.slice("output.".length).split(".");
    const actualValue = readPath(observed.output, path);
    return actualValue === expectedValue
      ? null
      : `Expected ${target} to be "${String(expectedValue)}" but observed "${String(actualValue)}".`;
  }

  return `Unsupported assertion target "${target}".`;
}

function readPath(value: unknown, path: string[]): unknown {
  let current: unknown = value;

  for (const segment of path) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}
