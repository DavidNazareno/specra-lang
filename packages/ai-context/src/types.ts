export interface AiContextArtifact {
  service: string | null;
  goal: string;
  entities: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: string;
    }>;
  }>;
  operations: Array<{
    name: string;
    input: string[];
    output: string;
  }>;
  constraints: Record<string, string | number | boolean>;
  target: Record<string, string | number | boolean>;
  expectations: Array<{
    name: string;
    operation: string | null;
    auth: string;
    assertions: Array<{
      target: string;
      value: string | number | boolean;
    }>;
  }>;
}
