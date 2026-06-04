---
layout: home

hero:
  text: Contract-driven AI coding and verification
  tagline: Write a compact spec, let an agent implement against it, and verify observed behavior with a repeatable loop.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Language Guide
      link: /language-scl

features:
  - title: Markdown-first contracts
    details: Keep product intent in `.scl.md` files with fenced `specra` blocks and split by feature using imports.
  - title: Compact agent artifacts
    details: Refresh `.specra/ctx.json`, `.specra/plan.json`, and `.specra/specra.db` for low-noise agent context.
  - title: Proof-based verification
    details: Scaffold `proof.json`, let the agent fill it from test results, and verify expectations with `specra verify`.
---

## Core loop

```bash
pnpm add -D specra
specra init
specra check
specra refresh
specra proof
specra verify
```

Specra does not validate source code directly. It validates evidence supplied by the coding agent from tests or reproduction steps.
