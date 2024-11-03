export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(), milliseconds))
}

export async function promiseTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  throwOnTimeout: boolean = false
): Promise<T | null> {
  // Create a promise that resolves (or rejects) in <ms> milliseconds
  const timeout = new Promise<null>((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      if (!throwOnTimeout) {
        resolve(null)
      } else {
        reject()
      }
    }, milliseconds)
  })
  // Awaits the race, which will return null (or throw) on timeout
  return await Promise.race([promise, timeout])
}

/**
 * Create a promise that resolves after a minimum delay
 * @param promise to execute
 * @param milliseconds length of minimum delay time in ms
 */
export async function promiseMinDelay(
  promise: Promise<unknown>,
  milliseconds: number
): Promise<unknown> {
  const minDelay = new Promise<null>((resolve) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      resolve(null)
    }, milliseconds)
  })
  // Waits until either the promise rejects
  // or both the promise and minimum delay have resolved.
  const [result] = await Promise.all([promise, minDelay])
  return result
}

export function debounceCallback<T extends (...args: void[]) => void>(
  func: T,
  wait: number
): { triggerDebounce: () => void; cancelDebounce: () => void } {
  let timeout: NodeJS.Timeout

  const cancelDebounce = (): void => {
    clearTimeout(timeout)
  }

  return {
    triggerDebounce: (): void => {
      clearTimeout(timeout)
      timeout = setTimeout(func, wait)
    },
    cancelDebounce
  }
}
