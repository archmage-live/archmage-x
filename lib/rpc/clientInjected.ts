export interface Context {
  fromUrl?: string
  window?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface Request {
  id: number
  ctx: Context
  service: string
  method: string
  args: any[]
}

export interface Response {
  id: number
  result?: any
  error?: any
}

export interface Event {
  eventName: EventType
  args: any[]
}

export type EventType = string
export type Listener = (...args: Array<any>) => void
export type EventMethodType = 'on' | 'off'

export interface EventEmitter {
  on: (eventName: EventType, listener: Listener) => void
  off: (eventName: EventType, listener: Listener) => void
}

export function isMsgEvent(msg: Response | Event): msg is Event {
  return !!(msg as Event).eventName
}

export function isMsgEventMethod(
  method: EventMethodType | any
): method is EventMethodType {
  return method === 'on' || method === 'off'
}

export abstract class AbstractRpcClient {
  protected listeners = new Map<EventType, Listener[]>()
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

        if (isMsgEventMethod(method)) {
          return this.eventFn(msg)
        }

        return this.callFn(msg)
      }
    }) as Service
  }

  private callFn(msg: Request): (...args: any[]) => Promise<any> {
    return (...args: any[]) => {
      msg.args = args
      return this.call(msg)
    }
  }

  private eventFn(
    msg: Request
  ): (eventName: EventType, listener: Listener) => void {
    const method = msg.method as EventMethodType
    return (eventName: EventType, listener: Listener) => {
      let listeners = this.listeners.get(eventName)
      if (!listeners) {
        listeners = []
        this.listeners.set(eventName, listeners)
      }

      switch (method) {
        case 'on':
          listeners.push(listener)
          if (listeners.length > 1) {
            // has been registered
            return
          }
          break
        case 'off':
          const index = listeners.indexOf(listener)
          if (index > -1) {
            listeners.splice(index, 1)
          }
          if (listeners.length) {
            // don't need to unregister
            return
          }
          this.listeners.delete(eventName)
          break
      }

      msg.args = [eventName]
      this.call(msg).catch((err) => {
        throw err
      })
    }
  }

  abstract call(msg: Request): Promise<any>
}

export class RpcClientInjected extends AbstractRpcClient {
  constructor() {
    super()

    const listener = (event: MessageEvent) => {
      if (event.source !== window) {
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

if (typeof window !== 'undefined') {
  const global = window as any
  if (!global.archmage) {
    global.archmage = {}
  }
  if (!global.archmage.RpcClientInjected) {
    global.archmage.RpcClientInjected = RpcClientInjected
  }
}
