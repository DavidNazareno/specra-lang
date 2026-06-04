import type {
  SpecraDocument,
  SpecraEntity,
  SpecraExpectation,
  SpecraOperation,
} from './types.js'
import type {
  SpecraEntityModel,
  SpecraExpectationModel,
  SpecraModel,
  SpecraOperationModel,
} from './types.js'

export function normalizeDocument(document: SpecraDocument): SpecraModel {
  const entities = document.entities.map(createEntityModel)
  const operations = document.operations.map(createOperationModel)
  const expectations = document.expectations.map(createExpectationModel)

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
  }
}

function createEntityModel(entity: SpecraEntity): SpecraEntityModel {
  const fields = entity.fields.map((field) => ({ ...field }))
  return {
    name: entity.name,
    fields,
    fieldMap: Object.fromEntries(fields.map((field) => [field.name, field])),
  }
}

function createOperationModel(
  operation: SpecraOperation,
): SpecraOperationModel {
  return {
    name: operation.name,
    input: [...operation.input],
    output: operation.output,
    primaryInput: operation.input[0] ?? null,
  }
}

function createExpectationModel(
  expectation: SpecraExpectation,
): SpecraExpectationModel {
  return {
    name: expectation.name,
    operation: expectation.operation,
    auth: expectation.auth ?? 'optional',
    input: { ...expectation.input },
    assertions: expectation.assertions.map((assertion) => ({ ...assertion })),
  }
}
