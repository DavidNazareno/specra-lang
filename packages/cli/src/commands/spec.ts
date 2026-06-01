import path from "node:path";

import {
  createAiContext,
  renderAiImplementationBrief,
} from "@specra/ai-context";
import { validateDocument } from "@specra/core";
import { createVerificationPlan, normalizeDocument } from "@specra/ir";
import {
  renderVerificationReport,
  verifyObservedResults,
} from "@specra/verifier";
import {
  createSnapshotTemplate,
  extractObservedResultsFromSnapshot,
} from "@specra/verifier-typescript";

import type { CliOptions } from "../types.js";
import { ensureDir, readTextFile, writeTextFile } from "../lib/fs.js";
import {
  createGenericFiles,
  createObservedResultsTemplate,
  renderTrialGuide,
} from "../lib/generate-files.js";
import { printIssues } from "../lib/args.js";
import { loadProjectConfig } from "../lib/project-config.js";
import { formatSpecLocation, loadDocument } from "../lib/spec-loader.js";
import { resolveOutputDir } from "../lib/spec-paths.js";

export async function inspectSpec(inputFile: string): Promise<void> {
  const document = await loadDocument(inputFile);
  console.log(JSON.stringify(document, null, 2));
}

export async function checkSpec(inputFile: string): Promise<number> {
  const document = await loadDocument(inputFile);
  const issues = validateDocument(document);

  if (issues.length > 0) {
    printIssues(issues);
    return 1;
  }

  console.log(
    `Spec OK: ${document.service ?? "UnnamedService"} from ${formatSpecLocation(inputFile)} with ${document.entities.length} entities and ${document.operations.length} operations.`,
  );
  return 0;
}

export async function renderContext(inputFile: string): Promise<number> {
  const document = await loadDocument(inputFile);
  const issues = validateDocument(document);

  if (issues.length > 0) {
    printIssues(issues);
    return 1;
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
  return 0;
}

export async function generateArtifacts(
  inputFile: string,
  options: CliOptions,
): Promise<number> {
  const document = await loadDocument(inputFile);
  const issues = validateDocument(document);

  if (issues.length > 0) {
    printIssues(issues);
    return 1;
  }

  const outDir = await resolveOutputDir("generate", inputFile, options.out);
  const files = createGenericFiles(document);
  for (const file of files) {
    const outputPath = path.join(outDir, file.path);
    await ensureDir(path.dirname(outputPath));
    await writeTextFile(outputPath, file.content);
  }

  console.log(`Generated ${files.length} files in ${outDir}`);
  return 0;
}

export async function refreshArtifacts(
  inputFile: string,
  options: CliOptions,
): Promise<number> {
  const document = await loadDocument(inputFile);
  const issues = validateDocument(document);

  if (issues.length > 0) {
    printIssues(issues);
    return 1;
  }

  const outDir = await resolveOutputDir("refresh", inputFile, options.out);
  const files = createGenericFiles(document);
  for (const file of files) {
    const outputPath = path.join(outDir, file.path);
    await ensureDir(path.dirname(outputPath));
    await writeTextFile(outputPath, file.content);
  }

  console.log(`Refreshed ${files.length} Specra files in ${outDir}`);
  console.log(
    "- Use AI-BRIEF.md, ai-context.json, and verification-plan.json for the agent loop.",
  );
  return 0;
}

export async function runTrial(
  inputFile: string,
  options: CliOptions,
): Promise<number> {
  const document = await loadDocument(inputFile);
  const issues = validateDocument(document);

  if (issues.length > 0) {
    printIssues(issues);
    return 1;
  }

  const outDir = await resolveOutputDir("trial", inputFile, options.out);
  const model = normalizeDocument(document);
  const snapshotTemplate = createSnapshotTemplate(model);
  const trialFiles = [
    ...createGenericFiles(document),
    {
      path: "implementation-snapshot.template.json",
      content: `${JSON.stringify(snapshotTemplate, null, 2)}\n`,
    },
    {
      path: "observed-results.template.json",
      content: `${JSON.stringify(
        createObservedResultsTemplate(snapshotTemplate),
        null,
        2,
      )}\n`,
    },
    {
      path: "TRIAL.md",
      content: renderTrialGuide(inputFile, outDir),
    },
  ];

  for (const file of trialFiles) {
    const outputPath = path.join(outDir, file.path);
    await ensureDir(path.dirname(outputPath));
    await writeTextFile(outputPath, file.content);
  }

  let observedResultsSource = "observed-results.template.json";
  let observedResults: Parameters<typeof verifyObservedResults>[1] =
    createObservedResultsTemplate(snapshotTemplate);
  let extractionWarnings: string[] = [];

  if (options.impl) {
    const rawSnapshot = await readTextFile(options.impl);
    const snapshot = JSON.parse(rawSnapshot) as Parameters<
      typeof extractObservedResultsFromSnapshot
    >[1];
    const extraction = extractObservedResultsFromSnapshot(model, snapshot);
    observedResults = extraction.observedResults;
    extractionWarnings = extraction.warnings;
    observedResultsSource = "observed-results.from-impl.json";

    await writeTextFile(
      path.join(outDir, observedResultsSource),
      `${JSON.stringify(observedResults, null, 2)}\n`,
    );

    await writeTextFile(
      path.join(outDir, "extraction-warnings.json"),
      `${JSON.stringify(extractionWarnings, null, 2)}\n`,
    );
  }

  if (options.results) {
    const rawResults = await readTextFile(options.results);
    observedResults = JSON.parse(rawResults) as Parameters<
      typeof verifyObservedResults
    >[1];
    observedResultsSource = path.basename(options.results);
  }

  const report = verifyObservedResults(model, observedResults);
  await writeTextFile(
    path.join(outDir, "verification-report.txt"),
    renderVerificationReport(report),
  );

  console.log(`Prepared trial in ${outDir}`);
  console.log(
    `- Generated trial artifacts, templates, and guide for ${document.service ?? "UnnamedService"}.`,
  );
  console.log(
    `- Verification report written from ${observedResultsSource} with ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.missing} missing.`,
  );
  if (options.impl) {
    console.log(
      `- Extracted observed results from ${options.impl} with ${extractionWarnings.length} warnings.`,
    );
  }

  return report.summary.failed > 0 || report.summary.missing > 0 ? 1 : 0;
}

export async function extractTypeScriptResults(
  inputFile: string,
  options: CliOptions,
): Promise<number> {
  const document = await loadDocument(inputFile);
  const issues = validateDocument(document);

  if (issues.length > 0) {
    printIssues(issues);
    return 1;
  }

  if (!options.impl) {
    console.error('Missing "--impl <snapshot.json>" for extract-typescript.');
    return 1;
  }

  const model = normalizeDocument(document);
  const rawSnapshot = await readTextFile(options.impl);
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
  return 0;
}

export async function printSnapshotTemplate(
  inputFile: string,
): Promise<number> {
  const document = await loadDocument(inputFile);
  const issues = validateDocument(document);

  if (issues.length > 0) {
    printIssues(issues);
    return 1;
  }

  const model = normalizeDocument(document);
  console.log(JSON.stringify(createSnapshotTemplate(model), null, 2));
  return 0;
}

export async function verifySpec(
  inputFile: string,
  options: CliOptions,
): Promise<number> {
  const document = await loadDocument(inputFile);
  const issues = validateDocument(document);

  if (issues.length > 0) {
    printIssues(issues);
    return 1;
  }

  if (!options.results) {
    const config = await loadProjectConfig();
    const defaultResultsPath = path.join(
      config.generatedDir,
      "observed-results.json",
    );
    try {
      const rawResults = await readTextFile(defaultResultsPath);
      const observedResults = JSON.parse(rawResults) as Parameters<
        typeof verifyObservedResults
      >[1];
      const model = normalizeDocument(document);
      const report = verifyObservedResults(model, observedResults);

      console.log(renderVerificationReport(report));
      return report.summary.failed > 0 || report.summary.missing > 0 ? 1 : 0;
    } catch {
      console.error(
        `Missing "--results <file.json>" for verify, and no default "${defaultResultsPath}" was found.`,
      );
      return 1;
    }
  }

  const rawResults = await readTextFile(options.results);
  const observedResults = JSON.parse(rawResults) as Parameters<
    typeof verifyObservedResults
  >[1];
  const model = normalizeDocument(document);
  const report = verifyObservedResults(model, observedResults);

  console.log(renderVerificationReport(report));
  return report.summary.failed > 0 || report.summary.missing > 0 ? 1 : 0;
}
