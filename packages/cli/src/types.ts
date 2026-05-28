export interface CliOptions {
  database?: string;
  force?: boolean;
  impl?: string;
  location?: string;
  name?: string;
  out?: string;
  printConfig?: string;
  results?: string;
  runtime?: string;
  target?: string;
  yes?: boolean;
}

export interface InitProjectMetadata {
  database: string;
  displayName: string;
  runtime: string;
  serviceName: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}
