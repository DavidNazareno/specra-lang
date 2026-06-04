import type { AuthMode } from '@specra-lang/ast'

export const builtinTypes = new Set([
  'UUID',
  'Money',
  'boolean',
  'number',
  'string',
])
export const builtinOperationOutputs = new Set(['Result'])
export const authModes = new Set<AuthMode>(['missing', 'optional', 'valid'])
export const outcomeValues = new Set(['error', 'success', 'unauthorized'])
export const identifierPattern = /^[A-Za-z_][\w]*$/u
export const dottedIdentifierPattern = /^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)*$/u
