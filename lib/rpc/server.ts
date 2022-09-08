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

import {
  Context,
  HELLO,
  Request,
  Response,
  SERVICE_WORKER_CHANNEL
} from './client'

/**
 * RPC server side.
 */
export class RpcServer {
  private services = new Map<string, [object, boolean]>()
  private ports: browser.Runtime.Port[] = []

  constructor(private channel: string) {}

  registerService(
    serviceName: string,
    service: object,
    allowExternal?: boolean
  ) {
    if (this.services.has(serviceName)) {
      throw new Error(`service ${serviceName} has been registered`)
    }
    this.services.set(serviceName, [service, !allowExternal])
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
      // platform === Platform.FIREFOX ||
      (port.sender as any).origin === `chrome-extension://${browser.runtime.id}`

    if (port.name !== this.channel) {
      port.disconnect()
      console.warn(
        `invalid connection, port: ${port.name}, sender: ${
          (port.sender as any).origin
        }`
      )
      return
    }

    this.ports.push(port)
    port.onMessage.addListener(
      isInternal ? this.onMessageInternal : this.onMessage
    )
    port.onDisconnect.addListener(this.onDisconnect)
    // say hello to handshake
    port.postMessage(HELLO)
  }

  onDisconnect = (port: browser.Runtime.Port) => {
    const index = this.ports.findIndex((p) => p === port)
    if (index >= 0) {
      this.ports.splice(index, 1)
    }
  }

  onMessageInternal = (msg: Request, port: browser.Runtime.Port) => {
    msg.ctx.fromInternal = true
    this.onMessage(msg, port)
  }

  onMessage = (msg: Request, port: browser.Runtime.Port) => {
    const id = msg.id
    const service = this.services.get(msg.service)
    if (!service || (!msg.ctx.fromInternal && service?.[1])) {
      port.postMessage({
        id,
        error: `rpc service not found: ${msg.service}`
      })
      return
    }

    const args = [
      ...msg.args,
      {
        ...msg.ctx,
        fromUrl: msg.ctx?.fromInternal ? undefined : port.sender?.url
      } as Context
    ]

    let promise: Promise<any>
    try {
      promise = (service[0] as any)[msg.method](...args)
    } catch (err) {
      port.postMessage({
        id,
        error: `rpc service call failed: ${msg.service}.${msg.method}, error: ${err}`
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

        if (process.env.NODE_ENV === 'development') {
          throw err
        } else {
          console.log(err)
        }
      })
  }
}

export const SERVICE_WORKER_SERVER = new RpcServer(SERVICE_WORKER_CHANNEL)
