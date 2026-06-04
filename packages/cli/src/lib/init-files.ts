import path from 'node:path'

import type {
  GeneratedFile,
  InitProjectMetadata,
  InitTemplate,
} from '../types.js'
export function createInitFiles(
  metadata: InitProjectMetadata,
  template: InitTemplate,
): GeneratedFile[] {
  const isHelloWorld = template === 'hello-world'
  const featureFileName = 'hello-world.scl.md'
  const featureTitle = 'Hello World'
  const serviceDescription = isHelloWorld
    ? 'This root contract file imports a tiny hello-world example so you can test the full Specra loop quickly.'
    : 'This root contract file gives you the smallest possible Specra contract so you can shape it to your app without pre-imposed structure.'
  const featureDescription =
    'This feature file gives you the smallest useful example of a Specra contract.'

  const serviceSpec = `# ${metadata.displayName}

${serviceDescription}

\`\`\`specra
service: ${metadata.serviceName}
goal: ${
    isHelloWorld
      ? `Return a predictable hello-world response for ${metadata.displayName}`
      : `Describe the first behavior you want to build for ${metadata.displayName}`
  }

entity ExampleResponse:
message: string
end

operation describeFirstBehavior:
input:
output: ExampleResponse
end

expectation describeFirstBehavior_success:
operation: describeFirstBehavior
auth: optional
expect outcome: success
expect output.message: "replace me"
end

target runtime: ${metadata.runtime}
target database: ${metadata.database}
\`\`\`
`

  const helloWorldRootSpec = `# ${metadata.displayName}

${serviceDescription}

\`\`\`specra
import "./features/${featureFileName}"

service: ${metadata.serviceName}
goal: Return a predictable hello-world response for ${metadata.displayName}

constraint auth_required: true

target runtime: ${metadata.runtime}
target database: ${metadata.database}
\`\`\`
`

  const featureSpec = isHelloWorld
    ? `# ${featureTitle}

${featureDescription}

\`\`\`specra
entity HelloResponse:
message: string
end

operation getHello:
input:
output: HelloResponse
end

expectation getHello_success:
operation: getHello
auth: optional
expect outcome: success
expect output.message: "hello world"
end
\`\`\`
`
    : `# ${featureTitle}

${featureDescription}

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
`

  const guide = `# Specra

This folder stores the product contract for your app and your AI workflow.
Keep the source contract here and let Specra write generated artifacts to \`.specra/\`.

## Suggested loop

1. Edit the \`.scl.md\` files in this folder until they capture the workflow you want.
2. Run \`pnpm specra-lang check\` to validate the contract.
3. Run \`pnpm specra-lang refresh\` to update the compact agent-facing artifacts in \`.specra/\`.
4. Run \`pnpm specra-lang proof\` to scaffold \`.specra/verify/proof.json\`.
5. Ask your coding agent to read the relevant specs in \`specra/\`.
   If it needs a syntax reference, tell it to run \`specra-lang guide\`.
6. Implement the app behavior and collect observed results from tests.
7. Replace the \`__fill__\` placeholders in \`proof.json\` with what the tests actually observed.
8. Run \`pnpm specra-lang verify\` or \`pnpm specra-lang verify --results ...\` to compare proof against the contract.

## Current reality

- Specra already validates \`.scl.md\`, writes compact runtime state, and verifies observed results.
- Extraction from real Next.js tests is not automatic yet. For now, let your coding agent bridge from tests into \`proof.json\`.
- The goal of this folder is to keep the contract next to the app source, inside the same repository, with minimal visible footprint.
`

  return [
    {
      path: path.join('.specra', '.gitignore'),
      content: '*\n!.gitignore\n',
    },
    {
      path: path.join('specra', 'README.md'),
      content: guide,
    },
    {
      path: path.join('specra', 'spec.scl.md'),
      content: isHelloWorld ? helloWorldRootSpec : serviceSpec,
    },
    ...(isHelloWorld
      ? [
          {
            path: path.join('specra', 'features', featureFileName),
            content: featureSpec,
          },
        ]
      : []),
  ]
}
