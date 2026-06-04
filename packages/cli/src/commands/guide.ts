import { renderSpecraGuide } from '../lib/guide.js'

export async function printGuide(): Promise<void> {
  console.log(renderSpecraGuide())
}
