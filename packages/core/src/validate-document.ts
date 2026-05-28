import type { SpecraDocument, SpecraOperation } from "@specra/ast";

import {
  builtinOperationOutputs,
  builtinTypes,
  outcomeValues,
} from "./constants.js";

export function validateDocument(document: SpecraDocument): string[] {
  const issues: string[] = [];
  const entityNames = new Set<string>();
  const expectationNames = new Set<string>();
  const operationMap = new Map<string, SpecraOperation>();

  if (!document.service) {
    issues.push("Missing service name.");
  }

  if (!document.goal) {
    issues.push("Missing service goal.");
  }

  if (document.entities.length === 0) {
    issues.push("At least one entity is required.");
  }

  for (const entity of document.entities) {
    if (entityNames.has(entity.name)) {
      issues.push(`Duplicate entity "${entity.name}".`);
    }
    entityNames.add(entity.name);

    if (entity.fields.length === 0) {
      issues.push(`Entity "${entity.name}" has no fields.`);
    }

    const fieldNames = new Set<string>();
    for (const field of entity.fields) {
      if (fieldNames.has(field.name)) {
        issues.push(`Entity "${entity.name}" repeats field "${field.name}".`);
      }
      fieldNames.add(field.name);
    }
  }

  for (const entity of document.entities) {
    for (const field of entity.fields) {
      if (!builtinTypes.has(field.type) && !entityNames.has(field.type)) {
        issues.push(
          `Field "${entity.name}.${field.name}" uses unknown type "${field.type}".`,
        );
      }
    }
  }

  if (document.operations.length === 0) {
    issues.push("At least one operation is required.");
  }

  for (const operation of document.operations) {
    if (operationMap.has(operation.name)) {
      issues.push(`Duplicate operation "${operation.name}".`);
    }
    operationMap.set(operation.name, operation);

    if (
      !builtinOperationOutputs.has(operation.output) &&
      !entityNames.has(operation.output)
    ) {
      issues.push(
        `Operation "${operation.name}" has unknown output "${operation.output}".`,
      );
    }

    for (const inputType of operation.input) {
      if (
        inputType &&
        inputType !== "Result" &&
        !builtinTypes.has(inputType) &&
        !entityNames.has(inputType)
      ) {
        issues.push(
          `Operation "${operation.name}" uses unknown input "${inputType}".`,
        );
      }
    }
  }

  for (const expectation of document.expectations) {
    if (expectationNames.has(expectation.name)) {
      issues.push(`Duplicate expectation "${expectation.name}".`);
    }
    expectationNames.add(expectation.name);

    if (!expectation.operation) {
      issues.push(
        `Expectation "${expectation.name}" is missing an operation reference.`,
      );
      continue;
    }

    const operation = operationMap.get(expectation.operation);
    if (!operation) {
      issues.push(
        `Expectation "${expectation.name}" references unknown operation "${expectation.operation}".`,
      );
      continue;
    }

    if (expectation.assertions.length === 0) {
      issues.push(
        `Expectation "${expectation.name}" must contain at least one assertion.`,
      );
    }

    const primaryInputType = operation.input[0];
    const primaryEntity =
      primaryInputType && entityNames.has(primaryInputType)
        ? (document.entities.find(
            (entity) => entity.name === primaryInputType,
          ) ?? null)
        : null;

    for (const inputField of Object.keys(expectation.input)) {
      if (
        primaryEntity &&
        !primaryEntity.fields.some((field) => field.name === inputField)
      ) {
        issues.push(
          `Expectation "${expectation.name}" uses unknown input field "${inputField}" for operation "${operation.name}".`,
        );
      }
    }

    for (const assertion of expectation.assertions) {
      if (assertion.target === "outcome") {
        if (
          typeof assertion.value !== "string" ||
          !outcomeValues.has(assertion.value)
        ) {
          issues.push(
            `Expectation "${expectation.name}" uses invalid outcome "${String(assertion.value)}".`,
          );
        }
        continue;
      }

      if (assertion.target.startsWith("output.")) {
        const outputPath = assertion.target.slice("output.".length);
        if (!outputPath) {
          issues.push(
            `Expectation "${expectation.name}" has an empty output assertion path.`,
          );
          continue;
        }

        if (builtinOperationOutputs.has(operation.output)) {
          continue;
        }

        const outputEntity = document.entities.find(
          (entity) => entity.name === operation.output,
        );
        const topLevelField = outputPath.split(".")[0];
        if (
          !outputEntity ||
          !outputEntity.fields.some((field) => field.name === topLevelField)
        ) {
          issues.push(
            `Expectation "${expectation.name}" uses unknown output path "${assertion.target}".`,
          );
        }
        continue;
      }

      issues.push(
        `Expectation "${expectation.name}" uses unsupported assertion target "${assertion.target}".`,
      );
    }
  }

  if (!document.target.runtime) {
    issues.push('Missing target "runtime".');
  }

  if (!document.target.database) {
    issues.push('Missing target "database".');
  }

  return issues;
}
