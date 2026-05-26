import type {
  AuthMode,
  ScalarValue,
  SpecraAssertion,
  SpecraDocument,
  SpecraEntity,
  SpecraExpectation,
  SpecraOperation,
} from "@specra/ast";

const builtinTypes = new Set(["UUID", "Money", "boolean", "number", "string"]);
const builtinOperationOutputs = new Set(["Result"]);
const authModes = new Set<AuthMode>(["missing", "optional", "valid"]);
const outcomeValues = new Set(["error", "success", "unauthorized"]);
const identifierPattern = /^[A-Za-z_][\w]*$/u;
const dottedIdentifierPattern = /^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)*$/u;

type ParseScope = "entity" | "expectation" | null;

function parseQuotedString(raw: string): string {
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }

  return raw;
}

function parseScalar(raw: string): ScalarValue {
  const value = parseQuotedString(raw.trim());

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }

  return value;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createEmptyDocument(): SpecraDocument {
  return {
    service: null,
    goal: "",
    entities: [],
    operations: [],
    expectations: [],
    constraints: {},
    target: {},
  };
}

export function parseDocument(source: string): SpecraDocument {
  const document = createEmptyDocument();
  const lines = source
    .split(/\r?\n/u)
    .map((line, index) => ({
      raw: line,
      value: line.trim(),
      lineNumber: index + 1,
    }))
    .filter((line) => line.value.length > 0 && !line.value.startsWith("#"));

  let currentEntity: SpecraEntity | null = null;
  let currentExpectation: SpecraExpectation | null = null;
  let scope: ParseScope = null;

  for (const line of lines) {
    if (line.value.startsWith("service ")) {
      if (scope) {
        throw new Error(
          `Line ${line.lineNumber}: "service" is only allowed at the top level.`,
        );
      }

      document.service = parseNamedDeclaration(
        line.value,
        "service",
        line.lineNumber,
      );
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
      scope = "entity";
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
      scope = null;
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

function parseNamedDeclaration(
  line: string,
  keyword: string,
  lineNumber: number,
): string {
  const name = line.slice(`${keyword} `.length).trim();

  if (!identifierPattern.test(name)) {
    throw new Error(
      `Line ${lineNumber}: invalid ${keyword} name "${name}". Use letters, numbers, and underscores only.`,
    );
  }

  return name;
}

function parseTextValue(line: string, key: string, lineNumber: number): string {
  const text = line.slice(`${key}:`.length).trim();

  if (!text) {
    throw new Error(`Line ${lineNumber}: "${key}" cannot be empty.`);
  }

  return parseQuotedString(text);
}

function parseField(line: string, lineNumber: number) {
  const [name, ...rest] = line.split(":");
  const type = rest.join(":").trim();

  if (!name || !type) {
    throw new Error(
      `Line ${lineNumber}: invalid field syntax "${line}". Use "name: Type".`,
    );
  }

  if (!identifierPattern.test(name.trim())) {
    throw new Error(`Line ${lineNumber}: invalid field name "${name.trim()}".`);
  }

  if (!identifierPattern.test(type)) {
    throw new Error(`Line ${lineNumber}: invalid field type "${type}".`);
  }

  return {
    name: name.trim(),
    type,
  };
}

function parseOperation(line: string, lineNumber: number): SpecraOperation {
  const signature = line.slice("operation ".length).trim();
  const match = signature.match(
    /^([A-Za-z_][\w]*)\(([^)]*)\)\s*->\s*([A-Za-z_][\w]*)$/u,
  );

  if (!match) {
    throw new Error(
      `Line ${lineNumber}: invalid operation syntax "${line}". Use "operation name(Input) -> Output".`,
    );
  }

  const [, name, inputRaw, output] = match;

  if (!name || inputRaw === undefined || !output) {
    throw new Error(`Invalid operation capture groups: ${line}`);
  }

  return {
    name,
    input: splitList(inputRaw),
    output,
  };
}

function assignKeyValue(
  target: Record<string, ScalarValue>,
  raw: string,
  lineNumber: number,
): void {
  const [key, ...rest] = raw.split(":");
  const value = rest.join(":").trim();

  if (!key || !value) {
    throw new Error(`Line ${lineNumber}: invalid key-value syntax "${raw}".`);
  }

  if (!identifierPattern.test(key.trim())) {
    throw new Error(`Line ${lineNumber}: invalid key "${key.trim()}".`);
  }

  target[key.trim()] = parseScalar(value);
}

function parseExpectationLine(
  expectation: SpecraExpectation,
  line: string,
  lineNumber: number,
): void {
  if (line.startsWith("operation:")) {
    if (expectation.operation) {
      throw new Error(
        `Line ${lineNumber}: expectation "${expectation.name}" repeats "operation".`,
      );
    }

    const operation = parseTextValue(line, "operation", lineNumber);
    if (!identifierPattern.test(operation)) {
      throw new Error(
        `Line ${lineNumber}: invalid operation reference "${operation}".`,
      );
    }
    expectation.operation = operation;
    return;
  }

  if (line.startsWith("auth:")) {
    if (expectation.auth) {
      throw new Error(
        `Line ${lineNumber}: expectation "${expectation.name}" repeats "auth".`,
      );
    }

    const auth = parseTextValue(line, "auth", lineNumber) as AuthMode;
    if (!authModes.has(auth)) {
      throw new Error(
        `Line ${lineNumber}: invalid auth mode "${auth}". Allowed values: valid, missing, optional.`,
      );
    }
    expectation.auth = auth;
    return;
  }

  if (line.startsWith("input ")) {
    const pair = line.slice("input ".length);
    const [key, ...rest] = pair.split(":");
    const value = rest.join(":").trim();

    if (!key || !value) {
      throw new Error(
        `Line ${lineNumber}: invalid input syntax "${line}". Use "input field: value".`,
      );
    }

    if (!identifierPattern.test(key.trim())) {
      throw new Error(
        `Line ${lineNumber}: invalid input field "${key.trim()}".`,
      );
    }

    expectation.input[key.trim()] = parseScalar(value);
    return;
  }

  if (line.startsWith("expect ")) {
    expectation.assertions.push(parseAssertion(line, lineNumber));
    return;
  }

  throw new Error(
    `Line ${lineNumber}: invalid expectation syntax "${line}". Allowed keys: operation, auth, input, expect.`,
  );
}

function parseAssertion(line: string, lineNumber: number): SpecraAssertion {
  const pair = line.slice("expect ".length);
  const [target, ...rest] = pair.split(":");
  const value = rest.join(":").trim();

  if (!target || !value) {
    throw new Error(
      `Line ${lineNumber}: invalid assertion syntax "${line}". Use "expect key: value".`,
    );
  }

  const normalizedTarget = target.trim();
  if (!dottedIdentifierPattern.test(normalizedTarget)) {
    throw new Error(
      `Line ${lineNumber}: invalid assertion target "${normalizedTarget}".`,
    );
  }

  return {
    target: normalizedTarget,
    value: parseScalar(value),
  };
}

export function validateDocument(document: SpecraDocument): string[] {
  const issues: string[] = [];
  const entityNames = new Set<string>();
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

export function createVerificationPlan(document: SpecraDocument) {
  return document.expectations.map((expectation) => ({
    expectation: expectation.name,
    operation: expectation.operation,
    auth: expectation.auth ?? "optional",
    input: expectation.input,
    assertions: expectation.assertions,
  }));
}
