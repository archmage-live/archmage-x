import type { PlasmoContentScript } from 'plasmo'

import type {
  Event,
  EventMethodType,
  EventType,
  Listener,
  Request,
  Response
} from '~lib/inject/client'
import { isMsgEventMethod } from '~lib/inject/client'
import { inject } from '~lib/inject/inject'
import { SERVICE_WORKER_CLIENT } from '~lib/rpc/client'

export const config: PlasmoContentScript = {
  // matches: ['*://*/*'],
  matches: ['<all_urls>'],
  all_frames: true,
  match_about_blank: false,
  run_at: 'document_start'
}

// console.log('archmage content script')

class RpcClientMiddleware {
  private static _instance?: RpcClientMiddleware

  static instance() {
    if (!RpcClientMiddleware._instance) {
      RpcClientMiddleware._instance = new RpcClientMiddleware()
    }
    return RpcClientMiddleware._instance
  }

  private events = new Map<string, Map<EventType, Listener>>()

  constructor() {
    SERVICE_WORKER_CLIENT.connect()

    const listener = (event: MessageEvent) => {
      if (event.source !== window) {
        return
      }

      const msg = event.data as Request
      if (typeof msg.id !== 'number' || !msg.service || !msg.method) {
        return
      }

      if (isMsgEventMethod(msg.method)) {
        let events = this.events.get(msg.service)
        if (!events) {
          events = new Map()
          this.events.set(msg.service, events)
        }

        const eventName = msg.args[0] as EventType
        switch (msg.method as EventMethodType) {
          case 'on': {
            if (events.has(eventName)) {
              throw new Error(
                `event ${eventName} has been registered on service ${msg.service}`
              )
            }
            const listener = (...args: any[]) => {
              window.postMessage({
                service: msg.service,
                eventName,
                args
              } as Event)
            }
            SERVICE_WORKER_CLIENT.event(msg, listener)
            events.set(eventName, listener)
            break
          }
          case 'off': {
            const listener = events.get(eventName)
            if (listener) {
              SERVICE_WORKER_CLIENT.event(msg, listener)
              events.delete(eventName)
            }
            break
          }
        }
        return
      }

      const id = msg.id
      SERVICE_WORKER_CLIENT.call(msg)
        .then((result) => {
          window.postMessage({
            id,
            result
          } as Response)
        })
        .catch((error) => {
          window.postMessage({
            id,
            error
          } as Response)
        })
    }

    window.addEventListener('message', listener)
  }
}

RpcClientMiddleware.instance()

inject()
