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

import {
  AbstractRpcClient,
  Context,
  Event,
  Request,
  Response
} from './clientInjected'

export const HELLO = 'hello'

/**
 * RPC client side.
 */
export class RpcClient extends AbstractRpcClient {
  private port!: browser.Runtime.Port
  private connected: boolean = false
  private firstConnected: [Promise<boolean>, Function] | undefined

  constructor(private channel: string) {
    super()
  }

  connect() {
    let resolve
    const promise = new Promise((r: (value: boolean) => void) => {
      resolve = r
    })
    console.log('archmage connecting...')

    const browser = ((globalThis as any).browser || globalThis.chrome) as any
    this.port = browser.runtime.connect({ name: this.channel })
    this.firstConnected = [promise, resolve as any]

    this.port.onMessage.addListener(this.onMessage)
    this.port.onDisconnect.addListener(this.onDisconnect)
  }

  // disconnect() {
  //   this.port.disconnect()
  // }

  async call(msg: Request): Promise<any> {
    if (!this.firstConnected) {
      this.connect()
    }
    await this.firstConnected![0]

    msg.id = this.nextId++
    if (!this.connected) {
      throw new Error(`rpc not connected`)
    }

    // https://ryanve.com/lab/dimensions
    const {
      screenX: x,
      screenY: y,
      outerWidth: width,
      outerHeight: height
    } = globalThis

    msg.ctx = {
      window: {
        x,
        y,
        width,
        height
      }
    } as Context

    let resolve
    const promise = new Promise((r: (value: Response) => void) => {
      resolve = r
    })
    this.waits.set(msg.id, [promise, resolve as any])

    this.port.postMessage(msg)

    const response = await promise
    if (response.error) {
      throw response.error
    }
    return response.result
  }

  onMessage = (msg: Response | Event | typeof HELLO) => {
    // handshake
    if (msg === HELLO) {
      console.log(`archmage connected`)
      this.connected = true
      this.firstConnected![1](true)
      return
    }

    this.onMsg(msg)
  }

  onDisconnect = () => {
    console.log(`archmage disconnected`)
    this.connected = false
    this.firstConnected = undefined // enable reconnect
    for (const [id, [, resolve]] of this.waits.entries()) {
      resolve({
        id,
        error: `rpc disconnected`
      })
    }
    this.port = undefined as any
    this.listeners.clear()
    this.waits.clear()
  }
}

export const SERVICE_WORKER_CHANNEL = 'service-worker'

export const SERVICE_WORKER_CLIENT = new RpcClient(SERVICE_WORKER_CHANNEL)
