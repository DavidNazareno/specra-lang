import type { SpecraDocument } from "@specra/ast";

export function createVerificationPlan(document: SpecraDocument) {
  return document.expectations.map((expectation) => ({
    expectation: expectation.name,
    operation: expectation.operation,
    auth: expectation.auth ?? "optional",
    input: expectation.input,
    assertions: expectation.assertions,
  }));
}
