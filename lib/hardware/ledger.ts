import LedgerAppBtc from '@ledgerhq/hw-app-btc'
import LedgerAppCosmos from '@ledgerhq/hw-app-cosmos'
import LedgerAppEth from '@ledgerhq/hw-app-eth'
import TransportWebBLE from '@ledgerhq/hw-transport-web-ble'
import TransportWebHID from '@ledgerhq/hw-transport-webhid'
import { listen } from '@ledgerhq/logs'

import { NetworkKind } from '~lib/network'
import { DerivePosition } from '~lib/schema'
import { stall } from '~lib/util'

let transportHID: any, transportBLE: any
let unsubscribe: any

export async function getLedgerTransport(type: 'hid' | 'ble') {
  if (!unsubscribe) {
    unsubscribe = listen(console.log)
  }

  switch (type) {
    case 'hid': {
      if (!transportHID) {
        const devices = await TransportWebHID.list()
        for (const device of devices) {
          await device.close()
        }
        transportHID = await TransportWebHID.create()
      }
      return transportHID
    }
    case 'ble': {
      if (!transportBLE) {
        transportBLE = await TransportWebBLE.create()
      }
      return transportBLE
    }
  }
}

export function clearLedgerTransport(type: 'hid' | 'ble') {
  switch (type) {
    case 'hid': {
      transportHID = undefined
      break
    }
    case 'ble': {
      transportBLE = undefined
      break
    }
  }
}

export async function getLedgerBtcApp(
  type: 'hid' | 'ble' = 'hid'
): Promise<[LedgerAppBtc, string]> {
  const transport = await getLedgerTransport(type)
  const appBtc = new LedgerAppBtc(transport)
  const hash = await appBtc.getWalletXpub({
    path: "m/44'/0'/0'",
    xpubVersion: 0x0488b21e
  })
  return [appBtc, hash]
}

export async function getLedgerEthApp(
  type: 'hid' | 'ble' = 'hid'
): Promise<[LedgerAppEth, string]> {
  const transport = await getLedgerTransport(type)
  const appEth = new LedgerAppEth(transport)
  const appCfg = await Promise.race([appEth.getAppConfiguration(), stall(3000)])
  if (!appCfg) {
    throw new Error('TransportStatusError: Ledger device: UNKNOWN_ERROR')
  }
  console.log('ledger app configuration:', appCfg)
  const { address: hash } = await appEth.getAddress("m/44'/60'")
  return [appEth, hash]
}

export async function getLedgerCosmApp(
  type: 'hid' | 'ble' = 'hid'
): Promise<[LedgerAppCosmos, string]> {
  const transport = await getLedgerTransport(type)
  const appCosm = new LedgerAppCosmos(transport)
  const appCfg = await Promise.race([
    appCosm.getAppConfiguration(),
    stall(3000)
  ])
  if (!appCfg) {
    throw new Error('TransportStatusError: Ledger device: UNKNOWN_ERROR')
  }
  console.log('ledger app configuration:', appCfg)
  const { address: hash } = await appCosm.getAddress("m/44'/118'", 'cosmos')
  return [appCosm, hash]
}

export async function getLedgerAddress(
  app: LedgerAppEth | LedgerAppCosmos,
  path: string,
  prefix: string = 'cosmos'
): Promise<{
  publicKey: string
  address: string
}> {
  if (app instanceof LedgerAppEth) {
    return await app.getAddress(path)
  } else if (app instanceof LedgerAppCosmos) {
    return await app.getAddress(path, prefix!)
  }
  return {} as any
}

export interface LedgerPathSchema {
  description: string
  pathSchema: string
  derivePosition: DerivePosition
}

export const LEDGER_PATH_SCHEMAS = new Map<NetworkKind, LedgerPathSchema[]>([
  [
    'btc' as NetworkKind, // TODO
    [
      {
        description: 'BIP44 Standard',
        pathSchema: "m/44'/0'/0'/0/0",
        derivePosition: DerivePosition.ADDRESS_INDEX
      },
      {
        description: 'BIP49 Standard',
        pathSchema: "m/49'/0'/0'/0/0",
        derivePosition: DerivePosition.ADDRESS_INDEX
      },
      {
        description: 'BIP84 Standard',
        pathSchema: "m/84'/0'/0'/0/0",
        derivePosition: DerivePosition.ADDRESS_INDEX
      }
    ]
  ],
  [
    NetworkKind.EVM,
    [
      {
        description: 'Ledger Live',
        pathSchema: "m/44'/60'/0'/0/0",
        derivePosition: DerivePosition.ACCOUNT
      },
      {
        description: 'BIP44 Standard (e.g., Archmage, MetaMask)',
        pathSchema: "m/44'/60'/0'/0/0",
        derivePosition: DerivePosition.ADDRESS_INDEX
      },
      {
        description: 'Legacy (MEW / MyCrypto)',
        pathSchema: "m/44'/60'/0'/0",
        derivePosition: DerivePosition.CHANGE
      }
    ]
  ],
  [
    NetworkKind.COSM,
    [
      {
        description: 'BIP44 Standard',
        pathSchema: "m/44'/118'/0'/0/0",
        derivePosition: DerivePosition.ADDRESS_INDEX
      }
    ]
  ]
])
