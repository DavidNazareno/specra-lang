import type { parseDocument } from '@specra/core'
import { createVerificationPlan, normalizeDocument } from '@specra/ir'
import type { ObservedExpectationResult } from '@specra/verifier'

import type { GeneratedFile } from '../types.js'
import { contextFileName, planFileName } from '../config.js'

export interface RuntimeArtifacts {
  ctx: string
  plan: string
}

export interface CompactObservedResult {
  n: string
  o: string
  y?: Record<string, unknown>
  z?: string[]
}

export function createRuntimeArtifacts(
  document: ReturnType<typeof parseDocument>,
): RuntimeArtifacts {
  const model = normalizeDocument(document)
  const verificationPlan = createVerificationPlan(model)
  const ctx = createCompactContext(model)
  const plan = verificationPlan.map((expectation) => ({
    n: expectation.expectation,
    o: expectation.operation,
    a: expectation.auth,
    i: expectation.input,
    r: expectation.assertions.map((assertion) => [
      assertion.target,
      assertion.value,
    ]),
  }))

  return {
    ctx: `${JSON.stringify(ctx)}\n`,
    plan: `${JSON.stringify(plan)}\n`,
  }
}

export function createRefreshFiles(
  document: ReturnType<typeof parseDocument>,
): GeneratedFile[] {
  const artifacts = createRuntimeArtifacts(document)
  return [
    {
      path: contextFileName,
      content: artifacts.ctx,
    },
    {
      path: planFileName,
      content: artifacts.plan,
    },
  ]
}

export function createProofTemplate(
  document: ReturnType<typeof parseDocument>,
): CompactObservedResult[] {
  const model = normalizeDocument(document)
  const verificationPlan = createVerificationPlan(model)

  return verificationPlan.map((expectation) => ({
    n: expectation.expectation,
    o: '__fill__',
    ...(buildOutputTemplate(expectation.assertions)
      ? { y: buildOutputTemplate(expectation.assertions) }
      : {}),
  }))
}

export function encodeObservedResults(
  observedResults: ObservedExpectationResult[],
): CompactObservedResult[] {
  return observedResults.map((result) => ({
    n: result.expectation,
    o: result.outcome,
    ...(result.output ? { y: result.output } : {}),
    ...(result.notes?.length ? { z: result.notes } : {}),
  }))
}

export function decodeObservedResults(
  payload: unknown,
): ObservedExpectationResult[] {
  if (!Array.isArray(payload)) {
    throw new Error('Observed results must be a JSON array.')
  }

  return payload.map((entry) => {
    if (
      entry &&
      typeof entry === 'object' &&
      'expectation' in entry &&
      'outcome' in entry
    ) {
      const legacy = entry as ObservedExpectationResult
      return {
        expectation: legacy.expectation,
        outcome: legacy.outcome,
        ...(legacy.output ? { output: legacy.output } : {}),
        ...(legacy.notes ? { notes: legacy.notes } : {}),
      }
    }

    if (entry && typeof entry === 'object' && 'n' in entry && 'o' in entry) {
      const compact = entry as CompactObservedResult
      return {
        expectation: compact.n,
        outcome: compact.o,
        ...(compact.y ? { output: compact.y } : {}),
        ...(compact.z ? { notes: compact.z } : {}),
      }
    }

    throw new Error('Observed results contain an invalid entry.')
  })
}

function createCompactContext(model: ReturnType<typeof normalizeDocument>) {
  return {
    s: model.service,
    g: model.goal,
    e: model.entities.map((entity) => ({
      n: entity.name,
      f: entity.fields.map((field) => [field.name, field.type]),
    })),
    o: model.operations.map((operation) => ({
      n: operation.name,
      i: operation.input,
      o: operation.output,
    })),
    c: model.constraints,
    t: model.target,
    x: model.expectations.map((expectation) => ({
      n: expectation.name,
      o: expectation.operation,
      a: expectation.auth,
      r: expectation.assertions.map((assertion) => [
        assertion.target,
        assertion.value,
      ]),
    })),
  }
}

function buildOutputTemplate(
  assertions: ReturnType<typeof createVerificationPlan>[number]['assertions'],
): Record<string, unknown> | undefined {
  const outputAssertions = assertions.filter((assertion) =>
    assertion.target.startsWith('output.'),
  )

  if (outputAssertions.length === 0) {
    return undefined
  }

  const template: Record<string, unknown> = {}
  for (const assertion of outputAssertions) {
    assignPath(template, assertion.target.replace(/^output\./, ''), '__fill__')
  }

  return template
}

function assignPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segments = path.split('.')
  let current: Record<string, unknown> = target

  for (const [index, segment] of segments.entries()) {
    if (index === segments.length - 1) {
      current[segment] = value
      return
    }

    const next = current[segment]
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[segment] = {}
    }

    current = current[segment] as Record<string, unknown>
  }
}
