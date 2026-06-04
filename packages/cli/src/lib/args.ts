export function printIssues(issues: string[]): void {
  console.error('Validation failed:')
  for (const issue of issues) {
    console.error(`- ${issue}`)
  }
}
