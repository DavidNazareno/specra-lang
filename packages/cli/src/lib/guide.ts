export function renderSpecraGuide(): string {
  return `# Specra Guide

Specra is a contract-and-verification layer for AI-assisted development.

## Recommended files

- Keep product contracts in \`specra/\`
- Prefer \`.scl.md\` files
- Use fenced \`\`\`specra blocks inside Markdown
- Split by feature with \`import "./relative-file.scl.md"\`

## Recommended workflow

1. Write or update the contract in \`specra/\`
2. Run \`specra check\`
3. Run \`specra refresh\`
4. Read:
   - \`.specra/ctx.json\`
   - \`.specra/plan.json\`
   - \`.specra/specra.db\`
5. Implement behavior in code
6. Execute tests or reproduction steps
7. Write observed behavior into \`.specra/verify/proof.json\`
8. Run \`specra verify\` or \`specra verify --results .specra/verify/proof.json\`

## Minimal syntax

\`\`\`md
# Example

\`\`\`specra
service: ExampleApp
goal: Describe the core workflow

target runtime: node
target database: postgres
\`\`\`
\`\`\`

## Block examples

\`\`\`specra
entity WorkItem:
id: UUID
title: string
status: string
end

operation createWorkItem:
input: WorkItem
output: WorkItem
end

expectation createWorkItem_success:
operation: createWorkItem
auth: valid
input title: "First item"
expect outcome: success
expect output.status: "draft"
end
\`\`\`

## Supported top-level statements

- \`import "./relative-file.scl.md"\`
- \`service: Name\`
- \`goal: text\`
- \`entity Name:\`
- \`operation Name:\`
- \`expectation Name:\`
- \`constraint key: value\`
- \`target key: value\`

## Notes

- Legacy plain \`.scl\` files are still supported
- Legacy inline operation syntax like \`operation createThing(Input) -> Output\` is still supported
- The contract is the source of truth when implementation and spec disagree
`;
}
