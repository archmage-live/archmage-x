import browser from 'webextension-polyfill'

import { db } from '~lib/db'
import { EvmWallet } from '~lib/wallet'

console.log('Hello from background script!')

browser.runtime.onConnect.addListener(function (port) {
  console.log('received on port:', port.name)
})

export {}
