import type { SpecraModel } from "@specra/ir";

import type { AiContextArtifact } from "./types.js";

export function createAiContext(model: SpecraModel): AiContextArtifact {
  return {
    service: model.service,
    goal: model.goal,
    entities: model.entities.map((entity) => ({
      name: entity.name,
      fields: entity.fields.map((field) => ({
        name: field.name,
        type: field.type,
      })),
    })),
    operations: model.operations.map((operation) => ({
      name: operation.name,
      input: operation.input,
      output: operation.output,
    })),
    constraints: model.constraints,
    target: model.target,
    expectations: model.expectations.map((expectation) => ({
      name: expectation.name,
      operation: expectation.operation,
      auth: expectation.auth,
      assertions: expectation.assertions,
    })),
  };
}
