/**
 * RPC server and client.
 * Constraints:
 * - The server side must be the unique listener on the channel.
 * - The server side must reply handshake to new connected clients.
 * - The server side must reply any rpc call, even if errors/exceptions occurred.
 * - The server side accepts connections from multiple RPC clients.
 * - The client must not send rpc call when disconnected to the server side.
 */
import assert from 'assert'
import browser from 'webextension-polyfill'

// import { Platform, getPlatform } from '~lib/platform'
import { HELLO, SERVICE_WORKER_CHANNEL } from './client'
import {
  Context,
  Event,
  EventEmitter,
  EventMethodType,
  EventType,
  Listener,
  Request,
  isMsgEventMethod
} from './clientInjected'

/**
 * RPC server side.
 */
export class RpcServer {
  services = new Map<string, [object, boolean]>()
  private conns: RpcConn[] = []

  constructor(public channel: string) {}

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

  onConnect = (port: browser.Runtime.Port) => {
    const conn = RpcConn.from(port, this)
    if (!conn) {
      return
    }
    this.conns.push(conn)
  }

  onDisconnect(conn: RpcConn) {
    const index = this.conns.findIndex((c) => c === conn)
    if (index >= 0) {
      this.conns.splice(index, 1)
    }
  }
}

class RpcConn {
  private events = new Map<any, Map<EventType, Listener>>()

  constructor(
    private port: browser.Runtime.Port,
    private fromInternal: boolean,
    private server: RpcServer
  ) {}

  static from(port: browser.Runtime.Port, server: RpcServer) {
    if (port.name !== server.channel) {
      port.disconnect()
      console.warn(
        `invalid connection, port: ${port.name}, sender: ${
          (port.sender as any).origin
        }`
      )
      return
    }

    // const platform = getPlatform()
    const isInternal =
      // platform === Platform.FIREFOX ||
      (port.sender as any).origin === `chrome-extension://${browser.runtime.id}`

    const conn = new RpcConn(port, isInternal, server)

    port.onMessage.addListener(conn.onMessage)
    port.onDisconnect.addListener(conn.onDisconnect)
    // say hello to handshake
    port.postMessage(HELLO)

    return conn
  }

  onDisconnect = () => {
    this.server.onDisconnect(this)
  }

  onMessage = (msg: Request, port: browser.Runtime.Port) => {
    const service = this.server.services.get(msg.service)
    if (!service || (!this.fromInternal && service?.[1])) {
      port.postMessage({
        id: msg.id,
        error: `rpc service not found: ${msg.service}`
      })
      return
    }

    if (isMsgEventMethod(msg.method)) {
      return this.onEvent(service[0], msg, port)
    }

    return this.onCall(service[0], msg, port)
  }

  onEvent = (service: any, msg: Request, port: browser.Runtime.Port) => {
    let events = this.events.get(service)
    if (!events) {
      events = new Map()
      this.events.set(service, events)
    }

    const emitter = service as EventEmitter
    const eventName = msg.args[0] as EventType

    switch (msg.method as EventMethodType) {
      case 'on': {
        assert(!events.has(eventName))
        const listener = (...args: any[]) => {
          port.postMessage({
            service: msg.service,
            eventName,
            args
          } as Event)
        }
        emitter.on(eventName, listener)
        events.set(eventName, listener)
        break
      }
      case 'off': {
        const listener = events.get(eventName)
        if (listener) {
          emitter.off(eventName, listener)
          events.delete(eventName)
        }
        break
      }
    }
  }

  onCall = (service: any, msg: Request, port: browser.Runtime.Port) => {
    const id = msg.id
    const args = [
      ...msg.args,
      {
        ...msg.ctx,
        fromUrl: this.fromInternal ? undefined : port.sender?.url
      } as Context
    ]

    let promise: Promise<any>
    try {
      promise = service[msg.method](...args)
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
