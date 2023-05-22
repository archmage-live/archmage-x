export function getBtcFeeBrief(fees: Record<string, number>) {
  return Math.floor(fees['3']) // 3 blocks or 30 minutes
}
