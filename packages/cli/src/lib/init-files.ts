import path from "node:path";

import type { GeneratedFile, InitProjectMetadata } from "../types.js";

export function createInitFiles(
  metadata: InitProjectMetadata,
): GeneratedFile[] {
  const serviceSpec = `# ${metadata.displayName}

This root contract file defines shared product intent and imports the first feature slice.

\`\`\`specra
import "./features/work-items.scl.md"

service ${metadata.serviceName}
goal: Describe the first user-visible workflow for ${metadata.displayName}

constraint auth_required: true

target runtime: ${metadata.runtime}
target database: ${metadata.database}
\`\`\`
`;

  const featureSpec = `# Work Items

This feature file holds the first operation and its expectations.

\`\`\`specra
entity WorkItem
id: UUID
title: string
status: string
end

operation createWorkItem(WorkItem) -> WorkItem

expectation createWorkItem_success
operation: createWorkItem
auth: valid
input title: "First item"
expect outcome: success
expect output.status: "draft"
end

expectation createWorkItem_requires_auth
operation: createWorkItem
auth: missing
input title: "First item"
expect outcome: unauthorized
end
\`\`\`
`;

  const guide = `# Specra

This folder stores the contract that your app and your AI workflow should follow.
You can keep one \`.scl.md\` file or split the contract by feature under \`specra/\`.

## Suggested loop

1. Edit the \`.scl.md\` files in this folder until they capture the workflow you want.
2. Run \`pnpm specra check\` to validate the contract.
3. Run \`pnpm specra trial --out specra/generated\` to produce the AI brief and verification templates.
4. Ask your coding agent to read the relevant specs in \`specra/\`, \`specra/generated/ai-context.json\`, and \`specra/generated/AI-BRIEF.md\`.
5. Implement the app behavior and collect observed results.
6. Re-run \`pnpm specra trial --out specra/generated --impl ...\` or \`--results ...\`.

## Current reality

- Specra already validates \`.scl.md\`, generates agent-facing context, and verifies observed results.
- Extraction from real Next.js tests is not automatic yet. For now, bridge into Specra through the snapshot or observed-results files.
- The goal of this folder is to keep the contract next to the app source, inside the same repository.
`;

  return [
    {
      path: path.join("specra", ".gitignore"),
      content: "generated/\n",
    },
    {
      path: path.join("specra", "README.md"),
      content: guide,
    },
    {
      path: path.join("specra", "service.scl.md"),
      content: serviceSpec,
    },
    {
      path: path.join("specra", "features", "work-items.scl.md"),
      content: featureSpec,
    },
  ];
}
