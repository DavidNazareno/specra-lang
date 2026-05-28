export interface ObservedExpectationResult {
  expectation: string;
  outcome: string;
  output?: Record<string, unknown>;
  notes?: string[];
}

export interface VerificationFinding {
  expectation: string;
  status: "pass" | "fail" | "missing";
  message: string;
}

export interface VerificationReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    missing: number;
  };
  findings: VerificationFinding[];
}
