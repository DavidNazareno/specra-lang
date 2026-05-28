import type { SpecraModel } from "@specra/ir";
import type { ObservedExpectationResult } from "@specra/verifier";

import type { TypeScriptImplementationSnapshot } from "./types.js";

export interface ExtractionReport {
  observedResults: ObservedExpectationResult[];
  warnings: string[];
}

export function extractObservedResultsFromSnapshot(
  model: SpecraModel,
  snapshot: TypeScriptImplementationSnapshot,
): ExtractionReport {
  const warnings: string[] = [];
  const operationMap = new Map(
    (snapshot.operations ?? []).map((operation) => [operation.name, operation]),
  );

  const observedResults = model.expectations.flatMap((expectation) => {
    const snapshotExpectation = snapshot.expectations.find(
      (candidate) => candidate.expectation === expectation.name,
    );

    if (!snapshotExpectation) {
      warnings.push(
        `Missing snapshot result for expectation "${expectation.name}".`,
      );
      return [];
    }

    if (expectation.operation) {
      const observedOperation = operationMap.get(expectation.operation);
      if (observedOperation && !observedOperation.implemented) {
        warnings.push(
          `Operation "${expectation.operation}" is marked as not implemented.`,
        );
      }
    }

    return [
      {
        expectation: snapshotExpectation.expectation,
        outcome: snapshotExpectation.outcome,
        output: snapshotExpectation.output,
        notes: snapshotExpectation.notes,
      },
    ];
  });

  return {
    observedResults,
    warnings,
  };
}
