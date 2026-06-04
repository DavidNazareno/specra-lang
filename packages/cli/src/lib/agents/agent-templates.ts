import {
  getTargetDefinition,
  managedBlockEnd,
  managedBlockStart,
  type SupportedTarget,
} from '../agents/agent-targets.js'

export function renderManagedInstructionBlock(target: SupportedTarget): string {
  const definition = getTargetDefinition(target)

  return `${managedBlockStart}
# Specra for ${definition.title}

When this repository contains \`specra/\`, treat the \`.scl.md\` files in that folder as the product contract. Legacy \`.scl\` files are still supported.

## Required workflow

1. Read the relevant \`.scl.md\` files in \`specra/\` before implementing behavior.
   If you need a quick reference, run \`specra guide\`.
2. Run \`specra check\` after changes to the spec.
3. Run \`specra refresh\` to refresh:
   - \`.specra/ctx.json\`
   - \`.specra/plan.json\`
   - \`.specra/specra.db\`
4. Run \`specra proof\` to scaffold \`.specra/verify/proof.json\`.
5. Use the spec plus those compact artifacts as implementation guidance.
6. When validating behavior, execute the app tests or reproduction steps yourself.
7. Replace the \`__fill__\` placeholders in \`.specra/verify/proof.json\` with what the tests actually observed.
8. Run \`specra verify\` or \`specra verify --results .specra/verify/proof.json\`.

## Operating rules

- Do not treat implementation details as the source of truth when they conflict with the contract in \`specra/\`.
- Prefer updating the implementation or the spec explicitly instead of silently diverging.
- If tests pass but \`specra verify\` fails, treat the Specra contract as unresolved work.
- If \`specra/\` does not exist yet, suggest running \`specra init\`.
${managedBlockEnd}
`
}
