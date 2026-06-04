import type {
  AuthMode,
  ScalarValue,
  SpecraAssertion,
  SpecraDocument,
  SpecraExpectation,
  SpecraOperation,
} from '@specra/ast'

import {
  authModes,
  dottedIdentifierPattern,
  identifierPattern,
} from './constants.js'

export type ParseScope = 'entity' | 'expectation' | 'operation' | null

export function parseQuotedString(raw: string): string {
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1)
  }

  return raw
}

export function parseScalar(raw: string): ScalarValue {
  const value = parseQuotedString(raw.trim())

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  if (/^-?\d+$/.test(value)) {
    return Number(value)
  }

  return value
}

export function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function createEmptyDocument(): SpecraDocument {
  return {
    service: null,
    goal: '',
    entities: [],
    operations: [],
    expectations: [],
    constraints: {},
    target: {},
  }
}

export function parseNamedDeclaration(
  line: string,
  keyword: string,
  lineNumber: number,
): string {
  const name = line.slice(`${keyword} `.length).trim()

  if (!identifierPattern.test(name)) {
    throw new Error(
      `Line ${lineNumber}: invalid ${keyword} name "${name}". Use letters, numbers, and underscores only.`,
    )
  }

  return name
}

export function parseNamedBlockDeclaration(
  line: string,
  keyword: string,
  lineNumber: number,
): string {
  const prefix = `${keyword} `
  const suffix = ':'

  if (!line.startsWith(prefix) || !line.endsWith(suffix)) {
    throw new Error(
      `Line ${lineNumber}: invalid ${keyword} block syntax "${line}". Use "${keyword} Name:".`,
    )
  }

  const name = line.slice(prefix.length, -suffix.length).trim()

  if (!identifierPattern.test(name)) {
    throw new Error(
      `Line ${lineNumber}: invalid ${keyword} name "${name}". Use letters, numbers, and underscores only.`,
    )
  }

  return name
}

export function parseServiceDeclaration(
  line: string,
  lineNumber: number,
): string {
  if (line.startsWith('service ')) {
    return parseNamedDeclaration(line, 'service', lineNumber)
  }

  if (!line.startsWith('service:')) {
    throw new Error(
      `Line ${lineNumber}: invalid service syntax "${line}". Use "service Name" or "service: Name".`,
    )
  }

  const name = parseTextValue(line, 'service', lineNumber)
  if (!identifierPattern.test(name)) {
    throw new Error(
      `Line ${lineNumber}: invalid service name "${name}". Use letters, numbers, and underscores only.`,
    )
  }

  return name
}

export function parseTextValue(
  line: string,
  key: string,
  lineNumber: number,
): string {
  const text = line.slice(`${key}:`.length).trim()

  if (!text) {
    throw new Error(`Line ${lineNumber}: "${key}" cannot be empty.`)
  }

  return parseQuotedString(text)
}

export function parseField(line: string, lineNumber: number) {
  const [name, ...rest] = line.split(':')
  const type = rest.join(':').trim()

  if (!name || !type) {
    throw new Error(
      `Line ${lineNumber}: invalid field syntax "${line}". Use "name: Type".`,
    )
  }

  if (!identifierPattern.test(name.trim())) {
    throw new Error(`Line ${lineNumber}: invalid field name "${name.trim()}".`)
  }

  if (!identifierPattern.test(type)) {
    throw new Error(`Line ${lineNumber}: invalid field type "${type}".`)
  }

  return {
    name: name.trim(),
    type,
  }
}

export function parseOperation(
  line: string,
  lineNumber: number,
): SpecraOperation {
  const signature = line.slice('operation '.length).trim()
  const match = signature.match(
    /^([A-Za-z_][\w]*)\(([^)]*)\)\s*->\s*([A-Za-z_][\w]*)$/u,
  )

  if (!match) {
    throw new Error(
      `Line ${lineNumber}: invalid operation syntax "${line}". Use "operation name(Input) -> Output".`,
    )
  }

  const [, name, inputRaw, output] = match

  if (!name || inputRaw === undefined || !output) {
    throw new Error(`Invalid operation capture groups: ${line}`)
  }

  return {
    name,
    input: splitList(inputRaw),
    output,
  }
}

export function createOperationBlock(
  line: string,
  lineNumber: number,
): SpecraOperation {
  return {
    name: parseNamedBlockDeclaration(line, 'operation', lineNumber),
    input: [],
    output: '',
  }
}

export function parseOperationBlockLine(
  operation: SpecraOperation,
  line: string,
  lineNumber: number,
): void {
  if (line.startsWith('input:')) {
    if (operation.input.length > 0) {
      throw new Error(
        `Line ${lineNumber}: operation "${operation.name}" repeats "input".`,
      )
    }

    const input = line.slice('input:'.length).trim()
    operation.input = splitList(input)
    return
  }

  if (line.startsWith('output:')) {
    if (operation.output) {
      throw new Error(
        `Line ${lineNumber}: operation "${operation.name}" repeats "output".`,
      )
    }

    const output = parseTextValue(line, 'output', lineNumber)
    if (!identifierPattern.test(output)) {
      throw new Error(
        `Line ${lineNumber}: invalid operation output "${output}".`,
      )
    }

    operation.output = output
    return
  }

  throw new Error(
    `Line ${lineNumber}: invalid operation syntax "${line}". Allowed keys: input, output.`,
  )
}

export function createExpectationBlock(
  line: string,
  lineNumber: number,
): SpecraExpectation {
  return {
    name: parseNamedBlockDeclaration(line, 'expectation', lineNumber),
    operation: null,
    auth: null,
    input: {},
    assertions: [],
  }
}

export function assignKeyValue(
  target: Record<string, ScalarValue>,
  raw: string,
  lineNumber: number,
): void {
  const [key, ...rest] = raw.split(':')
  const value = rest.join(':').trim()

  if (!key || !value) {
    throw new Error(`Line ${lineNumber}: invalid key-value syntax "${raw}".`)
  }

  if (!identifierPattern.test(key.trim())) {
    throw new Error(`Line ${lineNumber}: invalid key "${key.trim()}".`)
  }

  target[key.trim()] = parseScalar(value)
}

export function parseExpectationLine(
  expectation: SpecraExpectation,
  line: string,
  lineNumber: number,
): void {
  if (line.startsWith('operation:')) {
    if (expectation.operation) {
      throw new Error(
        `Line ${lineNumber}: expectation "${expectation.name}" repeats "operation".`,
      )
    }

    const operation = parseTextValue(line, 'operation', lineNumber)
    if (!identifierPattern.test(operation)) {
      throw new Error(
        `Line ${lineNumber}: invalid operation reference "${operation}".`,
      )
    }
    expectation.operation = operation
    return
  }

  if (line.startsWith('auth:')) {
    if (expectation.auth) {
      throw new Error(
        `Line ${lineNumber}: expectation "${expectation.name}" repeats "auth".`,
      )
    }

    const auth = parseTextValue(line, 'auth', lineNumber) as AuthMode
    if (!authModes.has(auth)) {
      throw new Error(
        `Line ${lineNumber}: invalid auth mode "${auth}". Allowed values: valid, missing, optional.`,
      )
    }
    expectation.auth = auth
    return
  }

  if (line.startsWith('input ')) {
    const pair = line.slice('input '.length)
    const [key, ...rest] = pair.split(':')
    const value = rest.join(':').trim()

    if (!key || !value) {
      throw new Error(
        `Line ${lineNumber}: invalid input syntax "${line}". Use "input field: value".`,
      )
    }

    if (!identifierPattern.test(key.trim())) {
      throw new Error(
        `Line ${lineNumber}: invalid input field "${key.trim()}".`,
      )
    }

    expectation.input[key.trim()] = parseScalar(value)
    return
  }

  if (line.startsWith('expect ')) {
    expectation.assertions.push(parseAssertion(line, lineNumber))
    return
  }

  throw new Error(
    `Line ${lineNumber}: invalid expectation syntax "${line}". Allowed keys: operation, auth, input, expect.`,
  )
}

export function parseAssertion(
  line: string,
  lineNumber: number,
): SpecraAssertion {
  const pair = line.slice('expect '.length)
  const [target, ...rest] = pair.split(':')
  const value = rest.join(':').trim()

  if (!target || !value) {
    throw new Error(
      `Line ${lineNumber}: invalid assertion syntax "${line}". Use "expect key: value".`,
    )
  }

  const normalizedTarget = target.trim()
  if (!dottedIdentifierPattern.test(normalizedTarget)) {
    throw new Error(
      `Line ${lineNumber}: invalid assertion target "${normalizedTarget}".`,
    )
  }

  return {
    target: normalizedTarget,
    value: parseScalar(value),
  }
}
