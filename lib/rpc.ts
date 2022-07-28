/**
 * RPC server and client.
 * Constraints:
 * - The server side must be the unique listener on the channel.
 * - The server side must reply handshake to new connected clients.
 * - The server side must reply any rpc call, even if errors/exceptions occurred.
 * - The server side accepts connections from multiple RPC clients.
 * - The client must not send rpc call when disconnected to the server side.
 */
import browser from 'webextension-polyfill'

import { Platform, getPlatform } from '~lib/platform'

interface Request {
  id: number
  service: string
  method: string
  args: any[]
}

interface Response {
  id: number
  result?: any
  error?: any
}

const hello = 'hello'

/**
 * RPC client side.
 */
export class RpcClient {
  private waits = new Map<number, [Promise<Response>, Function]>()
  private port!: browser.Runtime.Port
  private connected: boolean = false
  private nextId = 0

  constructor(private channel: string) {}

  connect() {
    this.port = browser.runtime.connect({ name: this.channel })
    this.port.onMessage.addListener(this.onMessage)
    this.port.onDisconnect.addListener(this.onDisconnect)
  }

  disconnect() {
    this.port.disconnect()
    this.onDisconnect()
  }

  service<Service>(serviceName: string): Service {
    return new Proxy(
      {},
      {
        get: (target: {}, method: string | symbol) => {
          const msg = {
            service: serviceName,
            method
          } as Request
          return this.callPartial(msg)
        }
      }
    ) as Service
  }

  private callPartial(msg: Request): (...args: any[]) => Promise<any> {
    return (...args: any[]) => {
      msg.args = args
      return this.call(msg)
    }
  }

  async call(msg: Request): Promise<any> {
    msg.id = this.nextId++
    if (!this.connected) {
      throw new Error(`rpc not connected`)
    }

    let resolve
    const promise = new Promise((r: (value: Response) => void) => {
      resolve = r
    })
    this.waits.set(msg.id, [promise, resolve as any])

    this.port.postMessage(msg)

    const response = await promise
    if (response.error) {
      throw new Error(response.error)
    }
    return response.result
  }

  onMessage = (msg: Response | typeof hello) => {
    // handshake
    if (msg === hello) {
      this.connected = true
      return
    }

    const wait = this.waits.get(msg.id)
    if (!wait) {
      console.error(`rpc received response, but no receiver: ${msg}`)
      return
    }
    this.waits.delete(msg.id)
    wait[1](msg)
  }

  onDisconnect = () => {
    this.connected = false
    for (const [id, [promise, resolve]] of this.waits.entries()) {
      resolve({
        id,
        error: `rpc disconnected`
      })
    }
    this.waits.clear()
  }
}

/**
 * RPC server side.
 */
export class RpcServer {
  private handlers = new Map<
    string,
    Map<string, (...args: any[]) => Promise<any>>
  >() // serviceName -> methodName -> handler
  private services = new Map<string, object>()
  private ports: browser.Runtime.Port[] = []

  constructor(private channel: string) {}

  registerHandlers(
    serviceName: string,
    handlers: Map<string, (...args: any[]) => Promise<any>>
  ) {
    if (this.handlers.has(serviceName) || this.services.has(serviceName)) {
      throw new Error(`service ${serviceName} has been registered`)
    }
    this.handlers.set(serviceName, handlers)
  }

  registerService(serviceName: string, service: object) {
    if (this.handlers.has(serviceName) || this.services.has(serviceName)) {
      throw new Error(`service ${serviceName} has been registered`)
    }
    this.services.set(serviceName, service)
  }

  listen() {
    browser.runtime.onConnect.addListener(this.onConnect)
  }

  connections() {
    return this.ports.length
  }

  onConnect = (port: browser.Runtime.Port) => {
    const platform = getPlatform()
    const isInternal =
      platform === Platform.FIREFOX ||
      (port.sender as any).origin === `chrome-extension://${browser.runtime.id}`
    if (port.name !== this.channel || !isInternal) {
      port.disconnect()
      console.warn(
        `invalid connection, port: ${port.name}, sender: ${
          (port.sender as any).origin
        }`
      )
      return
    }

    this.ports.push(port)
    port.onMessage.addListener(this.onMessage)
    port.onDisconnect.addListener(this.onDisconnect)
    // say hello to handshake
    port.postMessage(hello)
  }

  onDisconnect = (port: browser.Runtime.Port) => {
    const index = this.ports.findIndex((p) => p === port)
    if (index >= 0) {
      this.ports.splice(index, 1)
    }
  }

  onMessage = (msg: Request, port: browser.Runtime.Port) => {
    const id = msg.id
    const handlers = this.handlers.get(msg.service)
    const service = this.services.get(msg.service)
    if (!handlers && !service) {
      port.postMessage({
        id,
        error: `rpc service not found: ${msg.service}`
      })
      return
    }
    let promise: Promise<any> | undefined
    const method = handlers?.get(msg.method)
    if (method) {
      promise = method(...msg.args)
    } else if (service) {
      try {
        promise = (service as any)[msg.method](...msg.args)
      } catch (err) {
        port.postMessage({
          id,
          error: `rpc service call failed: ${msg.service}.${msg.method}, error: ${err}`
        })
        return
      }
    }
    if (!promise) {
      port.postMessage({
        id,
        error: `rpc service method not found: ${msg.service}.${msg.method}`
      })
      return
    }

    promise
      .then((result) => {
        port.postMessage({
          id,
          result
        })
      })
      .catch((err) => {
        port.postMessage({
          id,
          error: err.toString()
        })
      })
  }
}
