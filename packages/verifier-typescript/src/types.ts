export interface TypeScriptExpectationSnapshot {
  expectation: string;
  operation?: string;
  outcome: string;
  output?: Record<string, unknown>;
  notes?: string[];
}

export interface TypeScriptImplementationSnapshot {
  service?: string;
  operations?: Array<{
    name: string;
    implemented: boolean;
  }>;
  expectations: TypeScriptExpectationSnapshot[];
}
