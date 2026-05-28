import type {
  ScalarValue,
  SpecraDocument,
  SpecraEntity,
  SpecraExpectation,
  SpecraOperation,
} from "@specra/ast";

export interface SpecraFieldModel {
  name: string;
  type: string;
}

export interface SpecraEntityModel {
  name: string;
  fields: SpecraFieldModel[];
  fieldMap: Record<string, SpecraFieldModel>;
}

export interface SpecraOperationModel {
  name: string;
  input: string[];
  output: string;
  primaryInput: string | null;
}

export interface SpecraExpectationModel {
  name: string;
  operation: string | null;
  auth: string;
  input: Record<string, ScalarValue>;
  assertions: Array<{
    target: string;
    value: ScalarValue;
  }>;
}

export interface SpecraModel {
  service: string | null;
  goal: string;
  entities: SpecraEntityModel[];
  entityMap: Record<string, SpecraEntityModel>;
  operations: SpecraOperationModel[];
  operationMap: Record<string, SpecraOperationModel>;
  expectations: SpecraExpectationModel[];
  constraints: Record<string, ScalarValue>;
  target: Record<string, ScalarValue>;
}

export interface VerificationCase {
  expectation: string;
  operation: string | null;
  auth: string;
  input: Record<string, ScalarValue>;
  assertions: Array<{
    target: string;
    value: ScalarValue;
  }>;
}

export type {
  ScalarValue,
  SpecraDocument,
  SpecraEntity,
  SpecraExpectation,
  SpecraOperation,
};
