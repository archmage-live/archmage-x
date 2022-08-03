import type { PlasmoContentScript } from 'plasmo'

import { Request, Response, SERVICE_WORKER_CLIENT } from '~lib/rpc/client'

export const config: PlasmoContentScript = {
  matches: ['*://*/*'],
  all_frames: true,
  match_about_blank: false,
  run_at: 'document_start'
}

window.addEventListener('message', (event: MessageEvent<Request>) => {
  if (event.source !== window) {
    return
  }
  const msg = event.data
  if (typeof msg.id !== 'number' || !msg.service || !msg.method) {
    return
  }
  SERVICE_WORKER_CLIENT.call(msg)
    .then((result) => {
      window.postMessage({
        id: msg.id,
        result
      } as Response)
    })
    .catch((e) => {
      window.postMessage({
        id: msg.id,
        error: e.toString()
      } as Response)
    })
})
