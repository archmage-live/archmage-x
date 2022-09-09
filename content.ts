import type { PlasmoContentScript } from 'plasmo'

import { SERVICE_WORKER_CLIENT } from '~lib/rpc/client'
import type { Request, Response } from '~lib/rpc/clientInjected'

export const config: PlasmoContentScript = {
  // matches: ['*://*/*'],
  matches: ['<all_urls>'],
  all_frames: true,
  match_about_blank: false,
  run_at: 'document_start'
}

console.log('injected content script')

class RpcClientMiddleware {
  constructor() {
    const listener = (event: MessageEvent) => {
      if (event.source !== window) {
        return
      }

      const msg = event.data as Request
      if (typeof msg.id !== 'number' || !msg.service || !msg.method) {
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

const global = window as any
if (!global.archmage) {
  global.archmage = {}
}
if (!global.archmage._service_client_middleware) {
  global.archmage._service_client_middleware = new RpcClientMiddleware()
}
