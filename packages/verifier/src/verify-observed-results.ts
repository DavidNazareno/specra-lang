import type { SpecraModel } from '@specra/ir'

import { compareAssertion } from './assertions.js'
import type {
  ObservedExpectationResult,
  VerificationFinding,
  VerificationReport,
} from './types.js'

export function verifyObservedResults(
  model: SpecraModel,
  observedResults: ObservedExpectationResult[],
): VerificationReport {
  const findings: VerificationFinding[] = []
  const observedMap = new Map(
    observedResults.map((result) => [result.expectation, result]),
  )

  for (const expectation of model.expectations) {
    const observed = observedMap.get(expectation.name)

    if (!observed) {
      findings.push({
        expectation: expectation.name,
        status: 'missing',
        message: `No observed result was provided for expectation "${expectation.name}".`,
      })
      continue
    }

    const assertionFailures = expectation.assertions
      .map((assertion) =>
        compareAssertion(assertion.target, assertion.value, observed),
      )
      .filter(Boolean)

    if (assertionFailures.length === 0) {
      findings.push({
        expectation: expectation.name,
        status: 'pass',
        message: `Expectation "${expectation.name}" matched all assertions.`,
      })
      continue
    }

    findings.push({
      expectation: expectation.name,
      status: 'fail',
      message: assertionFailures.join(' '),
    })
  }

  return {
    summary: {
      total: findings.length,
      passed: findings.filter((finding) => finding.status === 'pass').length,
      failed: findings.filter((finding) => finding.status === 'fail').length,
      missing: findings.filter((finding) => finding.status === 'missing')
        .length,
    },
    findings,
  }
}
