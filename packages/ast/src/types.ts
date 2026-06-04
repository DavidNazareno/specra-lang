export interface SpecraDocument {
  service: string | null
  goal: string
  entities: SpecraEntity[]
  operations: SpecraOperation[]
  expectations: SpecraExpectation[]
  constraints: Record<string, ScalarValue>
  target: Record<string, ScalarValue>
}

export interface SpecraEntity {
  name: string
  fields: SpecraField[]
}

export interface SpecraField {
  name: string
  type: string
}

export interface SpecraOperation {
  name: string
  input: string[]
  output: string
}

export interface SpecraExpectation {
  name: string
  operation: string | null
  auth: AuthMode | null
  input: Record<string, ScalarValue>
  assertions: SpecraAssertion[]
}

export interface SpecraAssertion {
  target: string
  value: ScalarValue
}

export type AuthMode = 'missing' | 'optional' | 'valid'
export type ScalarValue = boolean | number | string
