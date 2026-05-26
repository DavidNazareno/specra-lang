#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createAiContext,
  renderAiImplementationBrief,
} from "@specra/ai-context";
import { parseDocument, validateDocument } from "@specra/core";
import { createVerificationPlan, normalizeDocument } from "@specra/ir";
import {
  renderVerificationReport,
  verifyObservedResults,
} from "@specra/verifier";
import {
  createSnapshotTemplate,
  extractObservedResultsFromSnapshot,
} from "@specra/verifier-typescript";

interface CliOptions {
  impl?: string;
  out?: string;
  results?: string;
}

async function main(): Promise<void> {
  const [command, inputFile, ...rest] = process.argv.slice(2);

  if (!command || !inputFile) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const options = parseOptions(rest);
  const source = await readFile(inputFile, "utf8");
  const document = parseDocument(source);
  const issues = validateDocument(document);

  if (command === "inspect") {
    console.log(JSON.stringify(document, null, 2));
    return;
  }

  if (command === "check") {
    if (issues.length > 0) {
      printIssues(issues);
      process.exitCode = 1;
      return;
    }

    console.log(
      `Spec OK: ${document.service ?? "UnnamedService"} with ${document.entities.length} entities and ${document.operations.length} operations.`,
    );
    return;
  }

  if (command === "context") {
    if (issues.length > 0) {
      printIssues(issues);
      process.exitCode = 1;
      return;
    }

    const model = normalizeDocument(document);
    console.log(
      JSON.stringify(
        {
          context: createAiContext(model),
          brief: renderAiImplementationBrief(model),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === "generate") {
    if (issues.length > 0) {
      printIssues(issues);
      process.exitCode = 1;
      return;
    }

    const outDir = options.out ?? "generated/specra-app";
    const files = createGenericFiles(document);
    for (const file of files) {
      const outputPath = path.join(outDir, file.path);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, file.content, "utf8");
    }

    console.log(`Generated ${files.length} files in ${outDir}`);
    return;
  }

  if (command === "extract-typescript") {
    if (issues.length > 0) {
      printIssues(issues);
      process.exitCode = 1;
      return;
    }

    if (!options.impl) {
      console.error('Missing "--impl <snapshot.json>" for extract-typescript.');
      process.exitCode = 1;
      return;
    }

    const model = normalizeDocument(document);
    const rawSnapshot = await readFile(options.impl, "utf8");
    const snapshot = JSON.parse(rawSnapshot) as Parameters<
      typeof extractObservedResultsFromSnapshot
    >[1];
    const extraction = extractObservedResultsFromSnapshot(model, snapshot);

    console.log(
      JSON.stringify(
        {
          observedResults: extraction.observedResults,
          warnings: extraction.warnings,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === "snapshot-template") {
    if (issues.length > 0) {
      printIssues(issues);
      process.exitCode = 1;
      return;
    }

    const model = normalizeDocument(document);
    console.log(JSON.stringify(createSnapshotTemplate(model), null, 2));
    return;
  }

  if (command === "verify") {
    if (issues.length > 0) {
      printIssues(issues);
      process.exitCode = 1;
      return;
    }

    if (!options.results) {
      console.error('Missing "--results <file.json>" for verify.');
      process.exitCode = 1;
      return;
    }

    const rawResults = await readFile(options.results, "utf8");
    const observedResults = JSON.parse(rawResults) as Parameters<
      typeof verifyObservedResults
    >[1];
    const model = normalizeDocument(document);
    const report = verifyObservedResults(model, observedResults);

    console.log(renderVerificationReport(report));
    if (report.summary.failed > 0 || report.summary.missing > 0) {
      process.exitCode = 1;
    }
    return;
  }

  printUsage();
  process.exitCode = 1;
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    const value = args[index + 1];

    if (token === "--out" && value) {
      options.out = value;
      index += 1;
      continue;
    }

    if (token === "--impl" && value) {
      options.impl = value;
      index += 1;
      continue;
    }

    if (token === "--results" && value) {
      options.results = value;
      index += 1;
    }
  }

  return options;
}

function printIssues(issues: string[]): void {
  console.error("Validation failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
}

function printUsage(): void {
  console.log(`Usage:
  specra inspect <file.scl>
  specra check <file.scl>
  specra context <file.scl>
  specra snapshot-template <file.scl>
  specra extract-typescript <file.scl> --impl implementation-snapshot.json
  specra generate <file.scl> --out generated/my-app
  specra verify <file.scl> --results observed-results.json`);
}

function createGenericFiles(document: ReturnType<typeof parseDocument>) {
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

void main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown CLI error.");
  }
  process.exitCode = 1;
});
