import type { SpecraModel } from "@specra/ir";

export function renderAiImplementationBrief(model: SpecraModel): string {
  const lines = [
    `Service: ${model.service ?? "UnnamedService"}`,
    `Goal: ${model.goal}`,
    "",
    "Rules for the implementing agent:",
    "- Treat the Specra contract files (.scl.md or legacy .scl) as the source of truth.",
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
