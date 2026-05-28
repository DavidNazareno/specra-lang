import {
  getTargetDefinition,
  managedBlockEnd,
  managedBlockStart,
  type SupportedTarget,
} from "./agent-targets.js";

export function renderManagedInstructionBlock(target: SupportedTarget): string {
  const definition = getTargetDefinition(target);

  return `${managedBlockStart}
# Specra for ${definition.title}

When this repository contains \`specra/\`, treat the \`.scl.md\` files in that folder as the product contract. Legacy \`.scl\` files are still supported.

## Required workflow

1. Read the relevant \`.scl.md\` files in \`specra/\` before implementing behavior.
2. Run \`specra check\` after changes to the spec.
3. Run \`specra trial --out specra/generated\` to refresh:
   - \`specra/generated/ai-context.json\`
   - \`specra/generated/AI-BRIEF.md\`
   - \`specra/generated/verification-plan.json\`
4. Use those generated files as implementation guidance.
5. When validating behavior, execute the app tests or reproduction steps yourself.
6. Convert the observed behavior into \`specra/generated/observed-results.json\`.
7. Run \`specra verify --results specra/generated/observed-results.json\`.

## Operating rules

- Do not treat implementation details as the source of truth when they conflict with the contract in \`specra/\`.
- Prefer updating the implementation or the spec explicitly instead of silently diverging.
- If tests pass but \`specra verify\` fails, treat the Specra contract as unresolved work.
- If \`specra/\` does not exist yet, suggest running \`specra init\`.
${managedBlockEnd}
`;
}
