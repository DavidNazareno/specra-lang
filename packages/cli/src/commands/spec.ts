import path from "node:path";

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
  createRefreshFiles,
  createProofTemplate,
  createRuntimeArtifacts,
  createObservedResultsTemplate,
  decodeObservedResults,
  encodeObservedResults,
} from "../lib/generate-files.js";
import { printIssues } from "../lib/args.js";
import {
  resolveContextPath,
  resolvePlanPath,
  resolveProofPath,
  resolveReportPath,
  resolveSnapshotPath,
  resolveStateDbPath,
  resolveVerificationDir,
  resolveWarningsPath,
} from "../lib/layout.js";
import { loadProjectConfig } from "../lib/project-config.js";
import { formatSpecLocation, loadDocument } from "../lib/spec-loader.js";
import { resolveOutputDir } from "../lib/spec-paths.js";
import { writeStateDatabase } from "../lib/state-db.js";

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

  const artifacts = createRuntimeArtifacts(document);
  console.log(artifacts.ctx);
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
  const files = createRefreshFiles(document);
  for (const file of files) {
    const outputPath = path.join(outDir, file.path);
    await ensureDir(path.dirname(outputPath));
    await writeTextFile(outputPath, file.content);
  }

  await persistStateDatabase(document, outDir, {
    ctx: path.basename(resolveContextPath(outDir)),
    plan: path.basename(resolvePlanPath(outDir)),
  });

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
  const files = createRefreshFiles(document);
  for (const file of files) {
    const outputPath = path.join(outDir, file.path);
    await ensureDir(path.dirname(outputPath));
    await writeTextFile(outputPath, file.content);
  }

  await persistStateDatabase(document, outDir, {
    ctx: path.basename(resolveContextPath(outDir)),
    plan: path.basename(resolvePlanPath(outDir)),
  });

  console.log(`Refreshed ${files.length} Specra files in ${outDir}`);
  console.log("- Use ctx.json and plan.json for the agent loop.");
  return 0;
}

export async function prepareProof(
  inputFile: string,
  options: CliOptions,
): Promise<number> {
  const document = await loadDocument(inputFile);
  const issues = validateDocument(document);

  if (issues.length > 0) {
    printIssues(issues);
    return 1;
  }

  const outDir = await resolveOutputDir("proof", inputFile, options.out);
  const proofPath = resolveProofPath(outDir);
  const proofTemplate = createProofTemplate(document);

  await ensureDir(path.dirname(proofPath));
  await writeTextFile(proofPath, `${JSON.stringify(proofTemplate)}\n`);

  await persistStateDatabase(document, outDir, {
    ctx: path.basename(resolveContextPath(outDir)),
    plan: path.basename(resolvePlanPath(outDir)),
    proof: path.relative(outDir, proofPath),
  });

  console.log(`Prepared proof template in ${proofPath}`);
  console.log("- Run your tests or reproduction steps.");
  console.log(
    "- Replace __fill__ values with what the tests actually observed.",
  );
  console.log("- Run specra verify after updating proof.json.");
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
  const runtimeFiles = createRefreshFiles(document);
  const trialFiles = [
    ...runtimeFiles,
    {
      path: path.relative(outDir, resolveSnapshotPath(outDir)),
      content: `${JSON.stringify(snapshotTemplate)}\n`,
    },
    {
      path: path.relative(outDir, resolveProofPath(outDir)),
      content: `${JSON.stringify(createObservedResultsTemplate(snapshotTemplate))}\n`,
    },
  ];

  for (const file of trialFiles) {
    const outputPath = path.join(outDir, file.path);
    await ensureDir(path.dirname(outputPath));
    await writeTextFile(outputPath, file.content);
  }

  let observedResultsSource = path.relative(outDir, resolveProofPath(outDir));
  let observedResults: Parameters<typeof verifyObservedResults>[1] =
    decodeObservedResults(createObservedResultsTemplate(snapshotTemplate));
  let extractionWarnings: string[] = [];

  if (options.impl) {
    const rawSnapshot = await readTextFile(options.impl);
    const snapshot = JSON.parse(rawSnapshot) as Parameters<
      typeof extractObservedResultsFromSnapshot
    >[1];
    const extraction = extractObservedResultsFromSnapshot(model, snapshot);
    observedResults = extraction.observedResults;
    extractionWarnings = extraction.warnings;
    observedResultsSource = path.relative(outDir, resolveProofPath(outDir));

    await writeTextFile(
      resolveProofPath(outDir),
      `${JSON.stringify(encodeObservedResults(observedResults))}\n`,
    );

    await writeTextFile(
      resolveWarningsPath(outDir),
      `${JSON.stringify(extractionWarnings)}\n`,
    );
  }

  if (options.results) {
    const rawResults = await readTextFile(options.results);
    observedResults = decodeObservedResults(JSON.parse(rawResults));
    observedResultsSource = path.basename(options.results);
  }

  const report = verifyObservedResults(model, observedResults);
  await writeTextFile(
    resolveReportPath(outDir),
    renderVerificationReport(report),
  );

  await persistStateDatabase(
    document,
    outDir,
    {
      ctx: path.basename(resolveContextPath(outDir)),
      plan: path.basename(resolvePlanPath(outDir)),
      proof: path.relative(outDir, resolveProofPath(outDir)),
      report: path.relative(outDir, resolveReportPath(outDir)),
      snap: path.relative(outDir, resolveSnapshotPath(outDir)),
    },
    observedResults,
    report,
  );

  console.log(`Prepared trial in ${outDir}`);
  console.log(
    `- Generated compact runtime and verification artifacts for ${document.service ?? "UnnamedService"}.`,
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
        observedResults: encodeObservedResults(extraction.observedResults),
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
    const defaultResultsPath = resolveProofPath(config.generatedDir);
    try {
      const rawResults = await readTextFile(defaultResultsPath);
      const observedResults = decodeObservedResults(JSON.parse(rawResults));
      const model = normalizeDocument(document);
      const report = verifyObservedResults(model, observedResults);
      await writeTextFile(
        resolveReportPath(config.generatedDir),
        renderVerificationReport(report),
      );
      await persistStateDatabase(
        document,
        config.generatedDir,
        {
          ctx: path.basename(resolveContextPath(config.generatedDir)),
          plan: path.basename(resolvePlanPath(config.generatedDir)),
          proof: path.relative(config.generatedDir, defaultResultsPath),
          report: path.relative(
            config.generatedDir,
            resolveReportPath(config.generatedDir),
          ),
        },
        observedResults,
        report,
      );

      console.log(renderVerificationReport(report));
      return report.summary.failed > 0 || report.summary.missing > 0 ? 1 : 0;
    } catch {
      console.error(
        `Missing "--results <file.json>" for verify, and no default "${defaultResultsPath}" was found. Run "specra proof" to scaffold a proof file first.`,
      );
      return 1;
    }
  }

  const rawResults = await readTextFile(options.results);
  const observedResults = decodeObservedResults(JSON.parse(rawResults));
  const model = normalizeDocument(document);
  const report = verifyObservedResults(model, observedResults);
  const config = await loadProjectConfig();
  await writeTextFile(
    resolveReportPath(config.generatedDir),
    renderVerificationReport(report),
  );
  await persistStateDatabase(
    document,
    config.generatedDir,
    {
      ctx: path.basename(resolveContextPath(config.generatedDir)),
      plan: path.basename(resolvePlanPath(config.generatedDir)),
      proof: path.relative(config.generatedDir, options.results),
      report: path.relative(
        config.generatedDir,
        resolveReportPath(config.generatedDir),
      ),
    },
    observedResults,
    report,
  );

  console.log(renderVerificationReport(report));
  return report.summary.failed > 0 || report.summary.missing > 0 ? 1 : 0;
}

async function persistStateDatabase(
  document: Awaited<ReturnType<typeof loadDocument>>,
  outDir: string,
  artifacts: {
    ctx: string;
    plan: string;
    proof?: string;
    report?: string;
    snap?: string;
  },
  observedResults?: Parameters<typeof verifyObservedResults>[1],
  verificationReport?: ReturnType<typeof verifyObservedResults>,
): Promise<void> {
  await ensureDir(outDir);
  await ensureDir(resolveVerificationDir(outDir));
  const model = normalizeDocument(document);
  const verificationPlan = createVerificationPlan(model);
  writeStateDatabase(resolveStateDbPath(outDir), {
    document,
    model,
    verificationPlan,
    artifacts: {
      ctx: artifacts.ctx,
      plan: artifacts.plan,
      ...(artifacts.proof ? { proof: artifacts.proof } : {}),
      ...(artifacts.report ? { report: artifacts.report } : {}),
      ...(artifacts.snap ? { snap: artifacts.snap } : {}),
    },
    observedResults,
    verificationReport,
  });
}
