import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const cliEntry = path.join(process.cwd(), "packages/cli/dist/index.js");

const core = await import("../packages/core/dist/index.js");
const ir = await import("../packages/ir/dist/index.js");
const aiContext = await import("../packages/ai-context/dist/index.js");
const verifier = await import("../packages/verifier/dist/index.js");
const verifierTypeScript = await import(
  "../packages/verifier-typescript/dist/index.js"
);

async function readFixture(name) {
  return readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

async function runCli(args, cwd = process.cwd()) {
  return execFileAsync(process.execPath, [cliEntry, ...args], {
    cwd,
  });
}

async function runCliWithEnv(args, cwd, env) {
  return execFileAsync(process.execPath, [cliEntry, ...args], {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
  });
}

test("valid fixture parses and validates", async () => {
  const source = await readFixture("booking-valid.scl");
  const document = core.parseDocument(source);
  const issues = core.validateDocument(document);

  assert.equal(document.expectations.length, 2);
  assert.deepEqual(issues, []);
});

test("invalid fixture fails with a syntax error", async () => {
  const source = await readFixture("booking-invalid.scl");

  await assert.rejects(async () => {
    core.parseDocument(source);
  }, /invalid auth mode/);
});

test("normalized model produces verification plan and AI context", async () => {
  const source = await readFixture("booking-valid.scl");
  const document = core.parseDocument(source);
  const model = ir.normalizeDocument(document);
  const plan = ir.createVerificationPlan(model);
  const context = aiContext.createAiContext(model);
  const brief = aiContext.renderAiImplementationBrief(model);

  assert.equal(plan.length, 2);
  assert.equal(context.operations[0].name, "createReservation");
  assert.match(brief, /Rules for the implementing agent/);
});

test("verifier compares observed results against expectations", async () => {
  const source = await readFixture("booking-valid.scl");
  const model = ir.normalizeDocument(core.parseDocument(source));

  const report = verifier.verifyObservedResults(model, [
    {
      expectation: "createReservation_success",
      outcome: "success",
      output: {
        status: "pending",
      },
    },
    {
      expectation: "createReservation_requires_auth",
      outcome: "unauthorized",
    },
  ]);

  assert.equal(report.summary.failed, 0);
  assert.equal(report.summary.passed, 2);
});

test("typescript verifier extracts observed results from implementation snapshot", async () => {
  const source = await readFixture("booking-valid.scl");
  const snapshotRaw = await readFixture(
    "typescript-implementation-snapshot.json",
  );
  const model = ir.normalizeDocument(core.parseDocument(source));
  const snapshot = JSON.parse(snapshotRaw);

  const extraction = verifierTypeScript.extractObservedResultsFromSnapshot(
    model,
    snapshot,
  );

  assert.equal(extraction.observedResults.length, 2);
  assert.deepEqual(extraction.warnings, []);
});

test("cli trial command scaffolds a runnable end-to-end folder", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-trial-"));
  const outDir = path.join(tempDir, "trial");

  const { stdout } = await runCli(
    [
      "trial",
      "examples/booking-app/app.scl",
      "--out",
      outDir,
      "--impl",
      "tests/fixtures/typescript-implementation-snapshot.json",
    ],
    process.cwd(),
  );

  assert.match(stdout, /Prepared trial in/);

  const guide = await readFile(path.join(outDir, "TRIAL.md"), "utf8");
  const report = await readFile(
    path.join(outDir, "verification-report.txt"),
    "utf8",
  );
  const extractedResults = JSON.parse(
    await readFile(
      path.join(outDir, "observed-results.from-impl.json"),
      "utf8",
    ),
  );

  assert.match(guide, /Fastest path/);
  assert.match(report, /Passed: 2/);
  assert.equal(extractedResults.length, 2);
});

test("cli check supports the imports example from the repository", async () => {
  const { stdout } = await runCli(
    ["check", "examples/imports-app/service.scl.md"],
    process.cwd(),
  );

  assert.match(stdout, /Spec OK: ImportsBookingApp/);
});

test("cli init scaffolds a specra folder for an app repository", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-init-"));
  const fakeHome = path.join(tempDir, "home");

  await writeFile(
    path.join(tempDir, "package.json"),
    JSON.stringify(
      {
        name: "next-launchpad",
        dependencies: {
          next: "15.0.0",
        },
      },
      null,
      2,
    ),
  );

  const { stdout } = await runCliWithEnv(["init"], tempDir, {
    HOME: fakeHome,
  });
  const serviceSpec = await readFile(
    path.join(tempDir, "specra/service.scl.md"),
    "utf8",
  );
  const featureSpec = await readFile(
    path.join(tempDir, "specra/features/work-items.scl.md"),
    "utf8",
  );
  const guide = await readFile(path.join(tempDir, "specra/README.md"), "utf8");

  assert.match(stdout, /Initialized Specra/);
  assert.match(serviceSpec, /service NextLaunchpad/);
  assert.match(serviceSpec, /```specra/);
  assert.match(serviceSpec, /target runtime: nextjs/);
  assert.match(featureSpec, /expectation createWorkItem_success/);
  assert.match(guide, /Suggested loop/);
  assert.match(stdout, /No supported agents were detected/);
});

test("cli init auto-installs guidance for detected agents", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-init-agents-"));
  const fakeHome = path.join(tempDir, "home");

  await mkdir(path.join(fakeHome, ".codex"), { recursive: true });
  await mkdir(path.join(fakeHome, ".claude"), { recursive: true });
  await writeFile(
    path.join(tempDir, "package.json"),
    JSON.stringify(
      {
        name: "agent-ready-app",
      },
      null,
      2,
    ),
  );

  const { stdout } = await runCliWithEnv(["init"], tempDir, {
    HOME: fakeHome,
  });
  const agents = await readFile(path.join(tempDir, "AGENTS.md"), "utf8");
  const claude = await readFile(path.join(tempDir, "CLAUDE.md"), "utf8");

  assert.match(
    stdout,
    /Installed Specra agent guidance for codex, claude in local mode/,
  );
  assert.match(agents, /Specra for Codex/);
  assert.match(claude, /Specra for Claude Code/);
});

test("cli commands use specra\\/ by convention after init", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-default-"));
  const fakeHome = path.join(tempDir, "home");

  await writeFile(
    path.join(tempDir, "package.json"),
    JSON.stringify(
      {
        name: "acme-web",
      },
      null,
      2,
    ),
  );

  await runCliWithEnv(["init"], tempDir, {
    HOME: fakeHome,
  });

  const { stdout: checkStdout } = await runCli(["check"], tempDir);
  const { stdout: trialStdout } = await runCli(["trial"], tempDir);
  const report = await readFile(
    path.join(tempDir, "specra/generated/verification-report.txt"),
    "utf8",
  );

  assert.match(checkStdout, /Spec OK: AcmeWeb from specra\//);
  assert.match(trialStdout, /Prepared trial in specra\/generated/);
  assert.match(report, /Passed: 2/);
});

test("cli can merge split specs from specra\\/ and validate cross-file references", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-split-"));

  await mkdir(path.join(tempDir, "specra", "features"), { recursive: true });
  await writeFile(
    path.join(tempDir, "specra", "service.scl.md"),
    `# SplitApp

\`\`\`specra
import "./features/work-items.scl.md"

service SplitApp
goal: Validate cross-file references

target runtime: nextjs
target database: postgres
\`\`\`
`,
  );
  await writeFile(
    path.join(tempDir, "specra", "features", "work-items.scl.md"),
    `# Work Items

\`\`\`specra
entity WorkItem
id: UUID
title: string
status: string
end

operation createWorkItem(WorkItem) -> WorkItem

expectation createWorkItem_success
operation: createWorkItem
auth: valid
input title: "First item"
expect outcome: success
expect output.status: "draft"
end
\`\`\`
`,
  );

  const { stdout } = await runCli(["check"], tempDir);
  assert.match(stdout, /Spec OK: SplitApp from specra\//);
});

test("cli follows recursive spec imports from an explicit entry file", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-imports-"));

  await mkdir(path.join(tempDir, "specra", "features"), { recursive: true });
  await writeFile(
    path.join(tempDir, "specra", "service.scl.md"),
    `# ImportApp

\`\`\`specra
import "./features/work-items.scl.md"

service ImportApp
goal: Validate imported feature files

target runtime: nextjs
target database: postgres
\`\`\`
`,
  );
  await writeFile(
    path.join(tempDir, "specra", "features", "work-items.scl.md"),
    `# Work Items

\`\`\`specra
entity WorkItem
id: UUID
title: string
status: string
end

operation createWorkItem(WorkItem) -> WorkItem

expectation createWorkItem_success
operation: createWorkItem
auth: valid
input title: "First item"
expect outcome: success
expect output.status: "draft"
end
\`\`\`
`,
  );

  const { stdout } = await runCli(["check", "specra/service.scl.md"], tempDir);
  assert.match(stdout, /Spec OK: ImportApp from specra\/service\.scl\.md/);
});

test("cli rejects circular spec imports", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-cycle-"));

  await mkdir(path.join(tempDir, "specra"), { recursive: true });
  await writeFile(
    path.join(tempDir, "specra", "a.scl.md"),
    `# A

\`\`\`specra
import "./b.scl.md"

service CycleApp
goal: Detect cycles

target runtime: generic
target database: unknown
\`\`\`
`,
  );
  await writeFile(
    path.join(tempDir, "specra", "b.scl.md"),
    `# B

\`\`\`specra
import "./a.scl.md"

entity WorkItem
id: UUID
end
\`\`\`
`,
  );

  await assert.rejects(
    async () => runCli(["check", "specra/a.scl.md"], tempDir),
    /Circular spec import detected/,
  );
});

test("cli install writes managed agent instructions locally", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-install-"));

  await writeFile(path.join(tempDir, "AGENTS.md"), "# Existing agent notes\n");

  const { stdout } = await runCli(["install", "--target", "codex"], tempDir);
  const agents = await readFile(path.join(tempDir, "AGENTS.md"), "utf8");

  assert.match(stdout, /Installed Specra agent guidance/);
  assert.match(agents, /# Existing agent notes/);
  assert.match(agents, /Specra for Codex/);
  assert.match(
    agents,
    /specra verify --results specra\/generated\/observed-results.json/,
  );
});

test("cli uninstall removes only the managed local block", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-uninstall-"));

  await writeFile(path.join(tempDir, "CLAUDE.md"), "# User content\n");
  await runCli(["install", "--target", "claude"], tempDir);
  await runCli(["uninstall", "--target", "claude"], tempDir);

  const claude = await readFile(path.join(tempDir, "CLAUDE.md"), "utf8");
  assert.equal(claude, "# User content\n");
});

test("cli install supports global codex instructions", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-global-"));
  const fakeHome = path.join(tempDir, "home");

  const { stdout } = await runCliWithEnv(
    ["install", "--target", "codex", "--location", "global"],
    tempDir,
    {
      HOME: fakeHome,
    },
  );

  const agents = await readFile(
    path.join(fakeHome, ".codex", "AGENTS.md"),
    "utf8",
  );

  assert.match(stdout, /global mode/);
  assert.match(agents, /Specra for Codex/);
});

test("cli install supports local opencode instructions", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-opencode-"));

  const { stdout } = await runCli(["install", "--target", "opencode"], tempDir);
  const agents = await readFile(path.join(tempDir, "AGENTS.md"), "utf8");

  assert.match(stdout, /Installed Specra agent guidance/);
  assert.match(agents, /Specra for OpenCode/);
});

test("cli install supports global opencode instructions", async () => {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "specra-opencode-global-"),
  );
  const fakeHome = path.join(tempDir, "home");

  const { stdout } = await runCliWithEnv(
    ["install", "--target", "opencode", "--location", "global"],
    tempDir,
    {
      HOME: fakeHome,
    },
  );

  const agents = await readFile(
    path.join(fakeHome, ".config", "opencode", "AGENTS.md"),
    "utf8",
  );

  assert.match(stdout, /global mode/);
  assert.match(agents, /Specra for OpenCode/);
});

test("cli install can print a target config without writing files", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-print-"));

  const { stdout } = await runCli(
    ["install", "--print-config", "claude"],
    tempDir,
  );

  assert.match(stdout, /Specra for Claude Code/);
  await assert.rejects(readFile(path.join(tempDir, "CLAUDE.md"), "utf8"));
});
