export const isDetoxBuild = Boolean(process.env.DETOX_MODE)
export const isJestRun = !!process.env.JEST_WORKER_ID
// @ts-ignore
export const isNonJestDev = globalThis.__DEV__ && !isJestRun
