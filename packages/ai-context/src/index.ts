import type { SpecraModel } from "@specra/ir";

export interface AiContextArtifact {
  service: string | null;
  goal: string;
  entities: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: string;
    }>;
  }>;
  operations: Array<{
    name: string;
    input: string[];
    output: string;
  }>;
  constraints: Record<string, string | number | boolean>;
  target: Record<string, string | number | boolean>;
  expectations: Array<{
    name: string;
    operation: string | null;
    auth: string;
    assertions: Array<{
      target: string;
      value: string | number | boolean;
    }>;
  }>;
}

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

export function renderAiImplementationBrief(model: SpecraModel): string {
  const lines = [
    `Service: ${model.service ?? "UnnamedService"}`,
    `Goal: ${model.goal}`,
    "",
    "Rules for the implementing agent:",
    "- Treat the .scl file as the source of truth.",
    "- Implement every declared operation.",
    "- Respect every constraint before optimizing for style.",
    "- Ensure code behavior can satisfy every expectation.",
    "",
    "Entities:",
  ];

  for (const entity of model.entities) {
    lines.push(
      `- ${entity.name}: ${entity.fields.map((field) => `${field.name}:${field.type}`).join(", ")}`,
    );
  }

  lines.push("", "Operations:");
  for (const operation of model.operations) {
    lines.push(
      `- ${operation.name}(${operation.input.join(", ")}) -> ${operation.output}`,
    );
  }

  lines.push("", "Expectations:");
  for (const expectation of model.expectations) {
    lines.push(
      `- ${expectation.name}: operation=${expectation.operation ?? "missing"}, auth=${expectation.auth}, assertions=${expectation.assertions.map((assertion) => `${assertion.target}=${String(assertion.value)}`).join("; ")}`,
    );
  }

  lines.push("", "Constraints:");
  for (const [key, value] of Object.entries(model.constraints)) {
    lines.push(`- ${key}: ${String(value)}`);
  }

  return `${lines.join("\n")}\n`;
}
