import TrezorConnect, { DEVICE, DEVICE_EVENT } from '@trezor/connect-web'

import { WalletPathSchema } from '~lib/wallet'

let initialized = false

function initTrezor() {
  if (initialized) {
    return
  }

  initialized = true

  TrezorConnect.init({
    lazyLoad: true,
    manifest: {
      email: 'developer@archmage.live',
      appUrl: 'https://archmage.live'
    },
    env: 'webextension',
    debug: true
  })

  TrezorConnect.on(DEVICE_EVENT, (event) => {
    console.log(event)
  })
}

export type TrezorConnectApp = typeof TrezorConnect

export async function getTrezorApp(
  pathSchema: WalletPathSchema
): Promise<[TrezorConnectApp, string]> {
  initTrezor()

  const rep = await TrezorConnect.ethereumGetAddress({
    path: pathSchema.pathTemplate,
    showOnTrezor: false
  })

  if (!rep.success) {
    throw new Error(rep.payload.error)
  }

  return [TrezorConnect, `${rep.payload.address}-${pathSchema.derivePosition}`]
}
