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

export async function getLedgerCosmApp(type: 'hid' | 'ble' = 'hid') {
  const transport = await getLedgerTransport(type)
  return new LedgerAppCosmos(transport)
}

export interface LedgerPathSchema {
  description: string
  pathSchema: string
  derivePosition: DerivePosition
}

export const LEDGER_PATH_SCHEMAS = new Map<NetworkKind, LedgerPathSchema[]>([
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
  ]
])
