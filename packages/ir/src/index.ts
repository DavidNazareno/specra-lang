import type {
  ScalarValue,
  SpecraDocument,
  SpecraEntity,
  SpecraExpectation,
  SpecraOperation,
} from "@specra/ast";

export interface SpecraFieldModel {
  name: string;
  type: string;
}

export interface SpecraEntityModel {
  name: string;
  fields: SpecraFieldModel[];
  fieldMap: Record<string, SpecraFieldModel>;
}

export interface SpecraOperationModel {
  name: string;
  input: string[];
  output: string;
  primaryInput: string | null;
}

export interface SpecraExpectationModel {
  name: string;
  operation: string | null;
  auth: string;
  input: Record<string, ScalarValue>;
  assertions: Array<{
    target: string;
    value: ScalarValue;
  }>;
}

export interface SpecraModel {
  service: string | null;
  goal: string;
  entities: SpecraEntityModel[];
  entityMap: Record<string, SpecraEntityModel>;
  operations: SpecraOperationModel[];
  operationMap: Record<string, SpecraOperationModel>;
  expectations: SpecraExpectationModel[];
  constraints: Record<string, ScalarValue>;
  target: Record<string, ScalarValue>;
}

export interface VerificationCase {
  expectation: string;
  operation: string | null;
  auth: string;
  input: Record<string, ScalarValue>;
  assertions: Array<{
    target: string;
    value: ScalarValue;
  }>;
}

export function normalizeDocument(document: SpecraDocument): SpecraModel {
  const entities = document.entities.map(createEntityModel);
  const operations = document.operations.map(createOperationModel);
  const expectations = document.expectations.map(createExpectationModel);

  return {
    service: document.service,
    goal: document.goal,
    entities,
    entityMap: Object.fromEntries(
      entities.map((entity) => [entity.name, entity]),
    ),
    operations,
    operationMap: Object.fromEntries(
      operations.map((operation) => [operation.name, operation]),
    ),
    expectations,
    constraints: document.constraints,
    target: document.target,
  };
}

export function createVerificationPlan(model: SpecraModel): VerificationCase[] {
  return model.expectations.map((expectation) => ({
    expectation: expectation.name,
    operation: expectation.operation,
    auth: expectation.auth,
    input: expectation.input,
    assertions: expectation.assertions,
  }));
}

function createEntityModel(entity: SpecraEntity): SpecraEntityModel {
  const fields = entity.fields.map((field) => ({ ...field }));
  return {
    name: entity.name,
    fields,
    fieldMap: Object.fromEntries(fields.map((field) => [field.name, field])),
  };
}

function createOperationModel(
  operation: SpecraOperation,
): SpecraOperationModel {
  return {
    name: operation.name,
    input: [...operation.input],
    output: operation.output,
    primaryInput: operation.input[0] ?? null,
  };
}

function createExpectationModel(
  expectation: SpecraExpectation,
): SpecraExpectationModel {
  return {
    name: expectation.name,
    operation: expectation.operation,
    auth: expectation.auth ?? "optional",
    input: { ...expectation.input },
    assertions: expectation.assertions.map((assertion) => ({ ...assertion })),
  };
}
