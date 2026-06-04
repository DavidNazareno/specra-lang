import type { SpecraModel, VerificationCase } from './types.js'

export function createVerificationPlan(model: SpecraModel): VerificationCase[] {
  return model.expectations.map((expectation) => ({
    expectation: expectation.name,
    operation: expectation.operation,
    auth: expectation.auth,
    input: expectation.input,
    assertions: expectation.assertions,
  }))
}
