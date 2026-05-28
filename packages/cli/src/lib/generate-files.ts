import {
  createAiContext,
  renderAiImplementationBrief,
} from "@specra/ai-context";
import type { parseDocument } from "@specra/core";
import { createVerificationPlan, normalizeDocument } from "@specra/ir";
import type { createSnapshotTemplate } from "@specra/verifier-typescript";

import type { GeneratedFile } from "../types.js";

export function createGenericFiles(
  document: ReturnType<typeof parseDocument>,
): GeneratedFile[] {
  const serviceName = document.service ?? "unnamed-service";
  const model = normalizeDocument(document);
  const verificationPlan = createVerificationPlan(model);
  const aiContext = createAiContext(model);
  const aiBrief = renderAiImplementationBrief(model);
  const summary = [
    `# ${serviceName}`,
    "",
    document.goal,
    "",
    "## Entities",
    ...document.entities.map(
      (entity) =>
        `- ${entity.name}: ${entity.fields.map((field) => `${field.name}:${field.type}`).join(", ")}`,
    ),
    "",
    "## Operations",
    ...document.operations.map(
      (operation) =>
        `- ${operation.name}(${operation.input.join(", ")}) -> ${operation.output}`,
    ),
    "",
    "## Expectations",
    ...document.expectations.map(
      (expectation) =>
        `- ${expectation.name}: operation=${expectation.operation ?? "missing"}, assertions=${expectation.assertions.length}`,
    ),
    "",
    "## Constraints",
    ...Object.entries(document.constraints).map(
      ([key, value]) => `- ${key}: ${String(value)}`,
    ),
    "",
    "## Target",
    ...Object.entries(document.target).map(
      ([key, value]) => `- ${key}: ${String(value)}`,
    ),
  ].join("\n");

  return [
    {
      path: "specra.json",
      content: `${JSON.stringify(document, null, 2)}\n`,
    },
    {
      path: "SUMMARY.md",
      content: `${summary}\n`,
    },
    {
      path: "verification-plan.json",
      content: `${JSON.stringify(verificationPlan, null, 2)}\n`,
    },
    {
      path: "ai-context.json",
      content: `${JSON.stringify(aiContext, null, 2)}\n`,
    },
    {
      path: "AI-BRIEF.md",
      content: aiBrief,
    },
  ];
}

export function createObservedResultsTemplate(
  snapshot: ReturnType<typeof createSnapshotTemplate>,
) {
  return snapshot.expectations.map((expectation) => ({
    expectation: expectation.expectation,
    outcome: expectation.outcome,
    output: expectation.output,
  }));
}

export function renderTrialGuide(inputFile: string, outDir: string): string {
  return `# Specra Trial

This folder is a ready-to-run local trial for the spec at \`${inputFile}\`.

## Files

- \`specra.json\`: parsed source contract
- \`SUMMARY.md\`: human-readable summary
- \`verification-plan.json\`: expectation checklist
- \`ai-context.json\`: agent-friendly context payload
- \`AI-BRIEF.md\`: implementation brief for an agent
- \`implementation-snapshot.template.json\`: template to fill from a TypeScript implementation or tests
- \`observed-results.template.json\`: direct verifier input if you want to skip the snapshot path
- \`verification-report.txt\`: current verifier output for this trial

## Fastest path

1. Read \`AI-BRIEF.md\`.
2. Implement the declared operations in your app or test harness.
3. Fill \`implementation-snapshot.template.json\` or \`observed-results.template.json\`.
4. Re-run one of these commands:

\`\`\`bash
pnpm specra trial ${inputFile} --out ${outDir} --impl ${outDir}/implementation-snapshot.template.json
pnpm specra trial ${inputFile} --out ${outDir} --results ${outDir}/observed-results.template.json
\`\`\`

5. Open \`verification-report.txt\` and inspect passes, failures, and missing expectations.

## Notes

- \`--impl\` follows the TypeScript snapshot path.
- \`--results\` skips extraction and verifies directly.
- The generated template usually starts as passing for documented expectations, so replace placeholder values with real observed behavior before trusting the report.
`;
}
