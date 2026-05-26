import type { ScalarValue } from "@specra/ast";
import type { SpecraModel } from "@specra/ir";

export interface ObservedExpectationResult {
  expectation: string;
  outcome: string;
  output?: Record<string, unknown>;
  notes?: string[];
}

export interface VerificationFinding {
  expectation: string;
  status: "pass" | "fail" | "missing";
  message: string;
}

export interface VerificationReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    missing: number;
  };
  findings: VerificationFinding[];
}

export function verifyObservedResults(
  model: SpecraModel,
  observedResults: ObservedExpectationResult[],
): VerificationReport {
  const findings: VerificationFinding[] = [];
  const observedMap = new Map(
    observedResults.map((result) => [result.expectation, result]),
  );

  for (const expectation of model.expectations) {
    const observed = observedMap.get(expectation.name);

    if (!observed) {
      findings.push({
        expectation: expectation.name,
        status: "missing",
        message: `No observed result was provided for expectation "${expectation.name}".`,
      });
      continue;
    }

    const assertionFailures = expectation.assertions
      .map((assertion) =>
        compareAssertion(assertion.target, assertion.value, observed),
      )
      .filter(Boolean);

    if (assertionFailures.length === 0) {
      findings.push({
        expectation: expectation.name,
        status: "pass",
        message: `Expectation "${expectation.name}" matched all assertions.`,
      });
      continue;
    }

    findings.push({
      expectation: expectation.name,
      status: "fail",
      message: assertionFailures.join(" "),
    });
  }

  return {
    summary: {
      total: findings.length,
      passed: findings.filter((finding) => finding.status === "pass").length,
      failed: findings.filter((finding) => finding.status === "fail").length,
      missing: findings.filter((finding) => finding.status === "missing")
        .length,
    },
    findings,
  };
}

export function renderVerificationReport(report: VerificationReport): string {
  const lines = [
    "Specra Verification Report",
    "",
    `Total expectations: ${report.summary.total}`,
    `Passed: ${report.summary.passed}`,
    `Failed: ${report.summary.failed}`,
    `Missing: ${report.summary.missing}`,
    "",
  ];

  for (const finding of report.findings) {
    lines.push(
      `[${finding.status.toUpperCase()}] ${finding.expectation}: ${finding.message}`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function compareAssertion(
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
