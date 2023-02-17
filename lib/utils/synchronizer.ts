export class Synchronizer {
  private waits: Map<string | number, Promise<any>> = new Map()

  get(key: string): {
    promise?: Promise<any>
    resolve: (value?: any) => void
    reject: (reason?: any) => void
  } {
    const wait = this.waits.get(key)
    if (wait) {
      return {
        promise: wait,
        resolve: doNothing,
        reject: doNothing
      }
    }

    let resolve: any
    let reject: any
    this.waits.set(
      key,
      new Promise((res, rej) => {
        resolve = res
        reject = rej
      })
    )

    return {
      resolve: (value: any) => {
        this.waits.delete(key)
        resolve(value)
      },
      reject: (reason: any) => {
        this.waits.delete(key)
        reject(reason)
      }
    }
  }
}

export class SingleSynchronizer {
  private promise?: Promise<any>

  get(): {
    promise?: Promise<any>
    resolve: (value?: any) => void
    reject: (reason?: any) => void
  } {
    if (this.promise) {
      return {
        promise: this.promise,
        resolve: doNothing,
        reject: doNothing
      }
    }

    let resolve: any
    let reject: any
    this.promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })

    return {
      resolve: (value: any) => {
        this.promise = undefined
        resolve(value)
      },
      reject: (reason: any) => {
        this.promise = undefined
        reject(reason)
      }
    }
  }
}

function doNothing() {}
