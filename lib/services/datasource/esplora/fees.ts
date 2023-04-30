import { fetchJson } from '~lib/fetch'

export async function getFeeEstimates() {
  // Get an object where the key is the confirmation target (in number of blocks) and the value is the estimated fee rate (in sat/vB).
  // The available confirmation targets are 1-25, 144, 504 and 1008 blocks.
  return (await fetchJson(`/fee-estimates`)) as Record<string, number>
}
