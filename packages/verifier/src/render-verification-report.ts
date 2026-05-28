import type { VerificationReport } from "./types.js";

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
