import type {
  SpecraDocument,
  SpecraEntity,
  SpecraExpectation,
  SpecraOperation,
} from "@specra/ast";

import {
  assignKeyValue,
  createExpectationBlock,
  createEmptyDocument,
  createOperationBlock,
  parseExpectationLine,
  parseField,
  parseNamedBlockDeclaration,
  parseNamedDeclaration,
  parseOperationBlockLine,
  parseOperation,
  parseServiceDeclaration,
  parseTextValue,
  type ParseScope,
} from "./parser-utils.js";

export function parseDocument(source: string): SpecraDocument {
  const document = createEmptyDocument();
  const lines = source
    .split(/\r?\n/u)
    .map((line, index) => ({
      value: line.trim(),
      lineNumber: index + 1,
    }))
    .filter((line) => line.value.length > 0 && !line.value.startsWith("#"));

  let currentEntity: SpecraEntity | null = null;
  let currentExpectation: SpecraExpectation | null = null;
  let currentOperation: SpecraOperation | null = null;
  let scope: ParseScope = null;

  for (const line of lines) {
    if (
      line.value.startsWith("service ") ||
      line.value.startsWith("service:")
    ) {
      if (scope) {
        throw new Error(
          `Line ${line.lineNumber}: "service" is only allowed at the top level.`,
        );
      }

      document.service = parseServiceDeclaration(line.value, line.lineNumber);
      continue;
    }

    if (line.value.startsWith("goal:")) {
      if (scope) {
        throw new Error(
          `Line ${line.lineNumber}: "goal" is only allowed at the top level.`,
        );
      }

      document.goal = parseTextValue(line.value, "goal", line.lineNumber);
      continue;
    }

    if (line.value.startsWith("entity ") && line.value.endsWith(":")) {
      if (scope) {
        throw new Error(
          `Line ${line.lineNumber}: nested blocks are not allowed.`,
        );
      }

      currentEntity = {
        name: parseNamedBlockDeclaration(line.value, "entity", line.lineNumber),
        fields: [],
      };
      document.entities.push(currentEntity);
      currentExpectation = null;
      currentOperation = null;
      scope = "entity";
      continue;
    }

    if (line.value.startsWith("entity ")) {
      if (scope) {
        throw new Error(
          `Line ${line.lineNumber}: nested blocks are not allowed.`,
        );
      }

      currentEntity = {
        name: parseNamedDeclaration(line.value, "entity", line.lineNumber),
        fields: [],
      };
      document.entities.push(currentEntity);
      currentExpectation = null;
      currentOperation = null;
      scope = "entity";
      continue;
    }

    if (line.value.startsWith("expectation ") && line.value.endsWith(":")) {
      if (scope) {
        throw new Error(
          `Line ${line.lineNumber}: nested blocks are not allowed.`,
        );
      }

      currentExpectation = createExpectationBlock(line.value, line.lineNumber);
      document.expectations.push(currentExpectation);
      currentEntity = null;
      currentOperation = null;
      scope = "expectation";
      continue;
    }

    if (line.value.startsWith("expectation ")) {
      if (scope) {
        throw new Error(
          `Line ${line.lineNumber}: nested blocks are not allowed.`,
        );
      }

      currentExpectation = {
        name: parseNamedDeclaration(line.value, "expectation", line.lineNumber),
        operation: null,
        auth: null,
        input: {},
        assertions: [],
      };
      document.expectations.push(currentExpectation);
      currentEntity = null;
      currentOperation = null;
      scope = "expectation";
      continue;
    }

    if (line.value === "end") {
      if (!scope) {
        throw new Error(
          `Line ${line.lineNumber}: unexpected "end" without an open block.`,
        );
      }

      currentEntity = null;
      currentExpectation = null;
      currentOperation = null;
      scope = null;
      continue;
    }

    if (line.value.startsWith("operation ") && line.value.endsWith(":")) {
      if (scope) {
        throw new Error(
          `Line ${line.lineNumber}: nested blocks are not allowed.`,
        );
      }

      currentOperation = createOperationBlock(line.value, line.lineNumber);
      document.operations.push(currentOperation);
      currentEntity = null;
      currentExpectation = null;
      scope = "operation";
      continue;
    }

    if (line.value.startsWith("operation ")) {
      if (scope) {
        throw new Error(
          `Line ${line.lineNumber}: operation declarations are only allowed at the top level.`,
        );
      }

      document.operations.push(parseOperation(line.value, line.lineNumber));
      continue;
    }

    if (line.value.startsWith("constraint ")) {
      if (scope) {
        throw new Error(
          `Line ${line.lineNumber}: constraints are only allowed at the top level.`,
        );
      }

      assignKeyValue(
        document.constraints,
        line.value.slice("constraint ".length),
        line.lineNumber,
      );
      continue;
    }

    if (line.value.startsWith("target ")) {
      if (scope) {
        throw new Error(
          `Line ${line.lineNumber}: targets are only allowed at the top level.`,
        );
      }

      assignKeyValue(
        document.target,
        line.value.slice("target ".length),
        line.lineNumber,
      );
      continue;
    }

    if (currentEntity && scope === "entity") {
      currentEntity.fields.push(parseField(line.value, line.lineNumber));
      continue;
    }

    if (currentExpectation && scope === "expectation") {
      parseExpectationLine(currentExpectation, line.value, line.lineNumber);
      continue;
    }

    if (currentOperation && scope === "operation") {
      parseOperationBlockLine(currentOperation, line.value, line.lineNumber);
      continue;
    }

    throw new Error(
      `Line ${line.lineNumber}: unrecognized syntax "${line.value}".`,
    );
  }

  if (scope) {
    throw new Error(
      `Unclosed ${scope} block: every block must end with "end".`,
    );
  }

  return document;
}
