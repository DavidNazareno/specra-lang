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

test("parser accepts the newer block-friendly syntax", async () => {
  const source = `service: BookingApp
goal: Manage restaurant reservations

entity Reservation:
id: UUID
status: string
end

operation createReservation:
input: Reservation
output: Reservation
end

expectation createReservation_success:
operation: createReservation
auth: valid
input status: "draft"
expect outcome: success
expect output.status: "draft"
end

target runtime: generic
target database: postgres
`;

  const document = core.parseDocument(source);
  const issues = core.validateDocument(document);

  assert.equal(document.service, "BookingApp");
  assert.equal(document.operations[0].name, "createReservation");
  assert.deepEqual(issues, []);
});

test("parser accepts empty input lists in operation blocks", async () => {
  const source = `service: HealthApi
goal: Check read-only operations

operation healthCheck:
input:
output: Result
end

expectation healthCheck_success:
operation: healthCheck
auth: optional
expect outcome: success
end

target runtime: generic
target database: unknown
`;

  const document = core.parseDocument(source);
  const issues = core.validateDocument(document);

  assert.deepEqual(document.operations[0].input, []);
  assert.deepEqual(issues, ["At least one entity is required."]);
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

  const report = await readFile(
    path.join(outDir, "verify", "report.txt"),
    "utf8",
  );
  const extractedResults = JSON.parse(
    await readFile(path.join(outDir, "verify", "proof.json"), "utf8"),
  );
  const plan = await readFile(path.join(outDir, "plan.json"), "utf8");
  const ctx = await readFile(path.join(outDir, "ctx.json"), "utf8");
  const db = await readFile(path.join(outDir, "specra.db"));

  assert.match(report, /Passed: 2/);
  assert.equal(extractedResults.length, 2);
  assert.match(plan, /createReservation_success/);
  assert.match(ctx, /BookingApp/);
  assert.ok(db.byteLength > 0);
});

test("cli check supports the imports example from the repository", async () => {
  const { stdout } = await runCli(
    ["check", "examples/imports-app/service.scl.md"],
    process.cwd(),
  );

  assert.match(stdout, /Spec OK: ImportsBookingApp/);
});

test("cli guide prints syntax and workflow help", async () => {
  const { stdout } = await runCli(["guide"], process.cwd());

  assert.match(stdout, /# Specra Guide/);
  assert.match(stdout, /Recommended workflow/);
  assert.match(stdout, /service: ExampleApp/);
});

test("cli respects project config for contract root and generated output", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-config-"));

  await mkdir(path.join(tempDir, "docs", "contracts"), { recursive: true });
  await writeFile(
    path.join(tempDir, "specra.config.jsonc"),
    `{
  // keep the contract outside the default folder
  "contractRoot": "docs/contracts",
  "generatedDir": ".cache/specra"
}
`,
  );
  await writeFile(
    path.join(tempDir, "docs", "contracts", "service.scl.md"),
    `# Config App

\`\`\`specra
service: ConfigApp
goal: Verify config-aware defaults

entity Ping:
value: string
end

operation ping:
input: Ping
output: Ping
end

expectation ping_success:
operation: ping
auth: optional
input value: "pong"
expect outcome: success
expect output.value: "pong"
end

target runtime: generic
target database: unknown
\`\`\`
`,
  );

  const { stdout: checkStdout } = await runCli(["check"], tempDir);
  const { stdout: refreshStdout } = await runCli(["refresh"], tempDir);
  const plan = await readFile(
    path.join(tempDir, ".cache", "specra", "plan.json"),
    "utf8",
  );
  const ctx = await readFile(
    path.join(tempDir, ".cache", "specra", "ctx.json"),
    "utf8",
  );
  const db = await readFile(
    path.join(tempDir, ".cache", "specra", "specra.db"),
  );

  assert.match(checkStdout, /Spec OK: ConfigApp from docs\/contracts/);
  assert.match(refreshStdout, /Refreshed 2 Specra files in \.cache\/specra/);
  assert.match(plan, /ping_success/);
  assert.match(ctx, /ConfigApp/);
  assert.ok(db.byteLength > 0);
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

  const { stdout } = await runCliWithEnv(["init", "--yes"], tempDir, {
    HOME: fakeHome,
  });
  const serviceSpec = await readFile(
    path.join(tempDir, "specra/spec.scl.md"),
    "utf8",
  );
  const guide = await readFile(path.join(tempDir, "specra/README.md"), "utf8");
  const hiddenIgnore = await readFile(
    path.join(tempDir, ".specra/.gitignore"),
    "utf8",
  );

  assert.match(stdout, /Initialized Specra/);
  assert.match(serviceSpec, /service: NextLaunchpad/);
  assert.match(serviceSpec, /```specra/);
  assert.match(serviceSpec, /target runtime: nextjs/);
  assert.match(serviceSpec, /operation describeFirstBehavior:/);
  assert.doesNotMatch(serviceSpec, /import "\.\/features\//);
  assert.match(guide, /Suggested loop/);
  assert.match(hiddenIgnore, /\*/);
  assert.match(stdout, /No supported agents were detected/);
});

test("cli init installs requested guidance for selected agents", async () => {
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

  const { stdout } = await runCliWithEnv(
    ["init", "--yes", "--target", "codex,claude"],
    tempDir,
    {
      HOME: fakeHome,
    },
  );
  const agents = await readFile(path.join(tempDir, "AGENTS.md"), "utf8");
  const claude = await readFile(path.join(tempDir, "CLAUDE.md"), "utf8");

  assert.match(
    stdout,
    /Installed Specra agent guidance for codex, claude in local mode/,
  );
  assert.match(agents, /Specra for Codex/);
  assert.match(claude, /Specra for Claude Code/);
});

test("cli init can scaffold the hello-world example", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-init-hello-"));
  const fakeHome = path.join(tempDir, "home");

  await writeFile(
    path.join(tempDir, "package.json"),
    JSON.stringify(
      {
        name: "hello-contract-app",
      },
      null,
      2,
    ),
  );

  const { stdout } = await runCliWithEnv(
    ["init", "--yes", "--template", "hello-world"],
    tempDir,
    {
      HOME: fakeHome,
    },
  );
  const serviceSpec = await readFile(
    path.join(tempDir, "specra/spec.scl.md"),
    "utf8",
  );
  const featureSpec = await readFile(
    path.join(tempDir, "specra/features/hello-world.scl.md"),
    "utf8",
  );

  assert.match(stdout, /Initialized Specra/);
  assert.match(serviceSpec, /import "\.\/features\/hello-world\.scl\.md"/);
  assert.match(featureSpec, /operation getHello:/);
  assert.match(featureSpec, /expect output\.message: "hello world"/);
});

test("cli init skips agent guidance by default in non-interactive mode", async () => {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "specra-init-noagents-"),
  );
  const fakeHome = path.join(tempDir, "home");

  await mkdir(path.join(fakeHome, ".codex"), { recursive: true });
  await writeFile(
    path.join(tempDir, "package.json"),
    JSON.stringify(
      {
        name: "no-agents-default-app",
      },
      null,
      2,
    ),
  );

  const { stdout } = await runCliWithEnv(["init", "--yes"], tempDir, {
    HOME: fakeHome,
  });

  assert.match(stdout, /Agent guidance was not installed/);
  await assert.rejects(readFile(path.join(tempDir, "AGENTS.md"), "utf8"));
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

  await runCliWithEnv(["init", "--yes"], tempDir, {
    HOME: fakeHome,
  });

  const { stdout: checkStdout } = await runCli(["check"], tempDir);
  const { stdout: refreshStdout } = await runCli(["refresh"], tempDir);
  const plan = await readFile(
    path.join(tempDir, ".specra", "plan.json"),
    "utf8",
  );
  const ctx = await readFile(path.join(tempDir, ".specra", "ctx.json"), "utf8");
  const db = await readFile(path.join(tempDir, ".specra", "specra.db"));

  assert.match(checkStdout, /Spec OK: AcmeWeb from specra\//);
  assert.match(refreshStdout, /Refreshed 2 Specra files in \.specra/);
  assert.match(plan, /describeFirstBehavior_success/);
  assert.match(ctx, /AcmeWeb/);
  assert.ok(db.byteLength > 0);
});

test("cli can merge split specs from specra\\/ and validate cross-file references", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-split-"));

  await mkdir(path.join(tempDir, "specra", "features"), { recursive: true });
  await writeFile(
    path.join(tempDir, "specra", "spec.scl.md"),
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
    path.join(tempDir, "specra", "spec.scl.md"),
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

  const { stdout } = await runCli(["check", "specra/spec.scl.md"], tempDir);
  assert.match(stdout, /Spec OK: ImportApp from specra\/spec\.scl\.md/);
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

test("cli reports unclosed specra markdown blocks clearly", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "specra-unclosed-"));

  await mkdir(path.join(tempDir, "specra"), { recursive: true });
  await writeFile(
    path.join(tempDir, "specra", "spec.scl.md"),
    `# Broken

\`\`\`specra
service: BrokenApp
goal: Detect malformed fenced blocks
`,
  );

  await assert.rejects(
    async () => runCli(["check"], tempDir),
    /unclosed ```specra block starting at line 3/i,
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
  assert.match(agents, /specra verify --results \.specra\/verify\/proof\.json/);
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
  const config = await readFile(path.join(tempDir, "opencode.jsonc"), "utf8");
  const agent = await readFile(
    path.join(tempDir, ".opencode/agents/specra.md"),
    "utf8",
  );

  assert.match(stdout, /Installed Specra agent guidance/);
  await assert.rejects(readFile(path.join(tempDir, "AGENTS.md"), "utf8"));
  assert.match(config, /"instructions"/);
  assert.match(config, /specra\/README\.md/);
  assert.match(agent, /Specra-guided implementation and verification workflow/);
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

  const config = await readFile(
    path.join(fakeHome, ".config", "opencode", "opencode.jsonc"),
    "utf8",
  );
  const agent = await readFile(
    path.join(fakeHome, ".config", "opencode", ".opencode/agents/specra.md"),
    "utf8",
  );

  assert.match(stdout, /global mode/);
  await assert.rejects(
    readFile(path.join(fakeHome, ".config", "opencode", "AGENTS.md"), "utf8"),
  );
  assert.match(config, /\$schema/);
  assert.match(agent, /Specra-guided implementation and verification workflow/);
});

test("cli uninstall removes opencode project files it manages", async () => {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "specra-opencode-remove-"),
  );

  await runCli(["install", "--target", "opencode"], tempDir);
  await runCli(["uninstall", "--target", "opencode"], tempDir);

  const config = await readFile(path.join(tempDir, "opencode.jsonc"), "utf8");
  await assert.rejects(
    readFile(path.join(tempDir, ".opencode/agents/specra.md"), "utf8"),
  );
  assert.doesNotMatch(config, /specra\/README\.md/);
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
