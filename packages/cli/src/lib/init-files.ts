import path from "node:path";

import type { GeneratedFile, InitProjectMetadata } from "../types.js";
export function createInitFiles(
  metadata: InitProjectMetadata,
): GeneratedFile[] {
  const serviceSpec = `# ${metadata.displayName}

This root contract file defines shared product intent and imports the first feature slice.

\`\`\`specra
import "./features/work-items.scl.md"

service: ${metadata.serviceName}
goal: Describe the first user-visible workflow for ${metadata.displayName}

constraint auth_required: true

target runtime: ${metadata.runtime}
target database: ${metadata.database}
\`\`\`
`;

  const featureSpec = `# Work Items

This feature file holds the first operation and its expectations.

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

expectation createWorkItem_requires_auth:
operation: createWorkItem
auth: missing
input title: "First item"
expect outcome: unauthorized
end
\`\`\`
`;

  const guide = `# Specra

This folder stores the product contract for your app and your AI workflow.
Keep the source contract here and let Specra write generated artifacts to \`.specra/\`.

## Suggested loop

1. Edit the \`.scl.md\` files in this folder until they capture the workflow you want.
2. Run \`pnpm specra check\` to validate the contract.
3. Run \`pnpm specra refresh\` to update the hidden agent-facing artifacts in \`.specra/generated/\`.
4. Ask your coding agent to read the relevant specs in \`specra/\`.
   If it needs a syntax reference, tell it to run \`specra guide\`.
5. Implement the app behavior and collect observed results.
6. Re-run \`pnpm specra trial\` if you need verification templates or \`pnpm specra verify --results ...\` for explicit verification.

## Current reality

- Specra already validates \`.scl.md\`, generates agent-facing context, and verifies observed results.
- Extraction from real Next.js tests is not automatic yet. For now, bridge into Specra through the snapshot or observed-results files.
- The goal of this folder is to keep the contract next to the app source, inside the same repository, with minimal visible footprint.
`;

  return [
    {
      path: path.join(".specra", ".gitignore"),
      content: "*\n!.gitignore\n",
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
