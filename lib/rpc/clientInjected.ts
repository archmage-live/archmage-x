export interface Request {
  id: number
  service: string
  method: string
  args: any[]
}

export interface Response {
  id: number
  result?: any
  error?: any
}

export abstract class AbstractRpcClient {
  protected waits = new Map<number, [Promise<Response>, Function]>()
  protected nextId = 0

  service<Service>(serviceName: string, service?: Service): Service {
    return new Proxy(service ?? {}, {
      get: (target: Service, method: string | symbol) => {
        if (typeof (target as any)[method] === 'function') {
          return (target as any)[method].bind(target)
        }

        const msg = {
          service: serviceName,
          method
        } as Request
        return this.callPartial(msg)
      }
    }) as Service
  }

  private callPartial(msg: Request): (...args: any[]) => Promise<any> {
    return (...args: any[]) => {
      msg.args = args
      return this.call(msg)
    }
  }

  abstract call(msg: Request): Promise<any>
}

const version = `RpcClient-${Date.now()}`
window.postMessage({
  version
})

export class RpcClientInjected extends AbstractRpcClient {
  constructor() {
    super()

    const listener = (event: MessageEvent) => {
      if (event.source !== window) {
        return
      }

      if (
        event.data.version?.startsWith('RpcClient') &&
        event.data.version !== version
      ) {
        window.removeEventListener('message', listener)
        return
      }

      const msg = event.data as Response
      if (
        typeof (msg as any).id !== 'number' ||
        !(Object.hasOwn(msg, 'result') || Object.hasOwn(msg, 'error'))
      ) {
        return
      }
      const wait = this.waits.get(msg.id)
      if (!wait) {
        console.error(
          `rpc received response, but no receiver: ${JSON.stringify(msg)}`
        )
        return
      }
      this.waits.delete(msg.id)
      wait[1](msg)
    }

    window.addEventListener('message', listener)
  }

  async call(msg: Request): Promise<any> {
    msg.id = this.nextId++

    let resolve
    const promise = new Promise((r: (value: Response) => void) => {
      resolve = r
    })
    this.waits.set(msg.id, [promise, resolve as any])

    window.postMessage(msg)

    const response = await promise
    if (response.error) {
      let err = response.error
      if (err.toString().includes('Extension context invalidated')) {
        window.location.reload()
      }
      try {
        err = JSON.parse(err)
      } catch {}
      throw err
    }
    return response.result
  }
}

const global = globalThis as any
if (!global.archmage) {
  global.archmage = {}
}
global.archmage._service_client_proxy = new RpcClientInjected()
