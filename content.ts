import type { PlasmoContentScript } from 'plasmo'

import type { Request, Response } from '~lib/rpc/client'
import { SERVICE_WORKER_CLIENT } from '~lib/rpc/client'

export const config: PlasmoContentScript = {
  // matches: ['*://*/*'],
  matches: ['<all_urls>'],
  all_frames: true,
  match_about_blank: false,
  run_at: 'document_start'
}

console.log('injected content script')

const version = `RpcRelayer-${Date.now()}`
window.postMessage({
  version
})

const listener = (event: MessageEvent) => {
  if (event.source !== window) {
    return
  }

  if (
    event.data.version?.startsWith('RpcRelayer') &&
    event.data.version !== version
  ) {
    window.removeEventListener('message', listener)
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
