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
    if (msg === hello) {
      this.connected = true
      return
    }

    const wait = this.waits.get(msg.id)
    if (!wait) {
      console.error(`rpc response to nobody: ${msg}`)
      return
    }
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

export class RpcServer {
  private handlers = new Map<
    string,
    Map<string, (...args: any[]) => Promise<any>>
  >()
  private ports: browser.Runtime.Port[] = []

  constructor(private channel: string) {}

  listen() {
    browser.runtime.onConnect.addListener(this.onConnect)
  }

  onConnect = (port: browser.Runtime.Port) => {
    const platform = getPlatform()
    const isInternal =
      platform === Platform.FIREFOX ||
      (port.sender as any).origin === `chrome-extension://${browser.runtime.id}`
    if (port.name !== this.channel || !isInternal) {
      console.error(
        `invalid connection, port: ${port.name}, sender: ${
          (port.sender as any).origin
        }`
      )
      return
    }

    this.ports.push(port)
    port.onMessage.addListener(this.onMessage)
    port.postMessage(hello)
  }

  onMessage = (msg: Request, port: browser.Runtime.Port) => {
    const id = msg.id
    const service = this.handlers.get(msg.service)
    if (!service) {
      port.postMessage({
        id,
        error: `rpc service not found: ${msg.service}`
      })
      return
    }
    const method = service.get(msg.method)
    if (!method) {
      port.postMessage({
        id,
        error: `rpc service method not found: ${service}.${msg.method}`
      })
      return
    }
    method(...msg.args)
      .then((result) => {
        port.postMessage({
          id,
          result
        })
      })
      .catch((e) => {
        port.postMessage({
          id,
          error: e.toString()
        })
      })
  }
}
