export class Synchronizer {
  private waits: Map<string, Promise<any>> = new Map()

  get(key: string): { promise?: Promise<any>; resolve: (value?: any) => void } {
    const wait = this.waits.get(key)
    if (wait) {
      return {
        promise: wait,
        resolve: resolveNothing
      }
    }

    let resolve: any
    this.waits.set(
      key,
      new Promise((r) => {
        resolve = r
      })
    )

    return {
      resolve: (value: any) => {
        this.waits.delete(key)
        resolve(value)
      }
    }
  }
}

function resolveNothing() {}
