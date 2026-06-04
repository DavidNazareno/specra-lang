export interface CliOptions {
  database?: string
  example?: boolean
  force?: boolean
  installAgents?: boolean
  location?: string
  name?: string
  out?: string
  printConfig?: string
  results?: string
  runtime?: string
  target?: string
  template?: string
  yes?: boolean
}

export interface InitProjectMetadata {
  database: string
  displayName: string
  runtime: string
  serviceName: string
}

export interface GeneratedFile {
  path: string
  content: string
}

export type InitTemplate = 'clean' | 'hello-world'
