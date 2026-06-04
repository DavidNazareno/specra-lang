import { DatabaseSync } from "node:sqlite";

import type { SpecraDocument } from "@specra/ast";
import type { SpecraModel, VerificationCase } from "@specra/ir";
import type {
  ObservedExpectationResult,
  VerificationReport,
} from "@specra/verifier";

export interface StateArtifacts {
  ctx: string;
  plan: string;
  proof?: string;
  report?: string;
  snap?: string;
}

export interface StateSnapshot {
  document: SpecraDocument;
  model: SpecraModel;
  verificationPlan: VerificationCase[];
  artifacts?: StateArtifacts;
  observedResults?: ObservedExpectationResult[];
  verificationReport?: VerificationReport;
}

export function writeStateDatabase(
  dbPath: string,
  snapshot: StateSnapshot,
): void {
  const db = new DatabaseSync(dbPath);

  try {
    db.exec(`
      PRAGMA journal_mode = WAL;

      DROP TABLE IF EXISTS meta;
      DROP TABLE IF EXISTS entities;
      DROP TABLE IF EXISTS operations;
      DROP TABLE IF EXISTS expectations;
      DROP TABLE IF EXISTS constraints;
      DROP TABLE IF EXISTS targets;
      DROP TABLE IF EXISTS artifacts;
      DROP TABLE IF EXISTS observed_results;
      DROP TABLE IF EXISTS verification_findings;
      DROP TABLE IF EXISTS search;

      CREATE TABLE meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE entities (
        name TEXT PRIMARY KEY,
        fields_json TEXT NOT NULL
      );

      CREATE TABLE operations (
        name TEXT PRIMARY KEY,
        input_json TEXT NOT NULL,
        output TEXT NOT NULL,
        primary_input TEXT
      );

      CREATE TABLE expectations (
        name TEXT PRIMARY KEY,
        operation_name TEXT,
        auth TEXT NOT NULL,
        input_json TEXT NOT NULL,
        assertions_json TEXT NOT NULL
      );

      CREATE TABLE constraints (
        name TEXT PRIMARY KEY,
        value_json TEXT NOT NULL
      );

      CREATE TABLE targets (
        name TEXT PRIMARY KEY,
        value_json TEXT NOT NULL
      );

      CREATE TABLE artifacts (
        name TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );

      CREATE TABLE observed_results (
        expectation TEXT PRIMARY KEY,
        outcome TEXT NOT NULL,
        output_json TEXT,
        notes_json TEXT
      );

      CREATE TABLE verification_findings (
        expectation TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        message TEXT NOT NULL
      );

      CREATE VIRTUAL TABLE search USING fts5(scope, name, body);
    `);

    const insertMeta = db.prepare(
      "INSERT INTO meta (key, value) VALUES (?, ?)",
    );
    insertMeta.run("service", snapshot.model.service ?? "");
    insertMeta.run("goal", snapshot.model.goal);
    insertMeta.run("contract_json", JSON.stringify(snapshot.document));

    const insertEntity = db.prepare(
      "INSERT INTO entities (name, fields_json) VALUES (?, ?)",
    );
    const insertOperation = db.prepare(
      "INSERT INTO operations (name, input_json, output, primary_input) VALUES (?, ?, ?, ?)",
    );
    const insertExpectation = db.prepare(
      "INSERT INTO expectations (name, operation_name, auth, input_json, assertions_json) VALUES (?, ?, ?, ?, ?)",
    );
    const insertConstraint = db.prepare(
      "INSERT INTO constraints (name, value_json) VALUES (?, ?)",
    );
    const insertTarget = db.prepare(
      "INSERT INTO targets (name, value_json) VALUES (?, ?)",
    );
    const insertArtifact = db.prepare(
      "INSERT INTO artifacts (name, payload) VALUES (?, ?)",
    );
    const insertObserved = db.prepare(
      "INSERT INTO observed_results (expectation, outcome, output_json, notes_json) VALUES (?, ?, ?, ?)",
    );
    const insertFinding = db.prepare(
      "INSERT INTO verification_findings (expectation, status, message) VALUES (?, ?, ?)",
    );
    const insertSearch = db.prepare(
      "INSERT INTO search (scope, name, body) VALUES (?, ?, ?)",
    );

    for (const entity of snapshot.model.entities) {
      const fields = entity.fields.map((field) => [field.name, field.type]);
      insertEntity.run(entity.name, JSON.stringify(fields));
      insertSearch.run(
        "entity",
        entity.name,
        `${entity.name} ${fields.map((field) => field.join(":")).join(" ")}`,
      );
    }

    for (const operation of snapshot.model.operations) {
      insertOperation.run(
        operation.name,
        JSON.stringify(operation.input),
        operation.output,
        operation.primaryInput,
      );
      insertSearch.run(
        "operation",
        operation.name,
        `${operation.name} ${operation.input.join(" ")} ${operation.output}`,
      );
    }

    for (const expectation of snapshot.model.expectations) {
      insertExpectation.run(
        expectation.name,
        expectation.operation,
        expectation.auth,
        JSON.stringify(expectation.input),
        JSON.stringify(expectation.assertions),
      );
      insertSearch.run(
        "expectation",
        expectation.name,
        `${expectation.name} ${expectation.operation ?? ""} ${expectation.assertions
          .map((assertion) => `${assertion.target} ${String(assertion.value)}`)
          .join(" ")}`,
      );
    }

    for (const [key, value] of Object.entries(snapshot.model.constraints)) {
      insertConstraint.run(key, JSON.stringify(value));
      insertSearch.run("constraint", key, `${key} ${String(value)}`);
    }

    for (const [key, value] of Object.entries(snapshot.model.target)) {
      insertTarget.run(key, JSON.stringify(value));
      insertSearch.run("target", key, `${key} ${String(value)}`);
    }

    if (snapshot.artifacts) {
      for (const [name, payload] of Object.entries(snapshot.artifacts)) {
        insertArtifact.run(name, payload);
      }
    }

    for (const observed of snapshot.observedResults ?? []) {
      insertObserved.run(
        observed.expectation,
        observed.outcome,
        observed.output ? JSON.stringify(observed.output) : null,
        observed.notes ? JSON.stringify(observed.notes) : null,
      );
    }

    for (const finding of snapshot.verificationReport?.findings ?? []) {
      insertFinding.run(finding.expectation, finding.status, finding.message);
    }
  } finally {
    db.close();
  }
}
