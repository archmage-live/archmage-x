import LedgerAppBtc, { AddressFormat } from '@ledgerhq/hw-app-btc';
import LedgerAppCosmos from '@ledgerhq/hw-app-cosmos';
import LedgerAppEth from '@ledgerhq/hw-app-eth';
import TransportWebBLE from '@ledgerhq/hw-transport-web-ble';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { listen } from '@ledgerhq/logs';



import { NetworkKind } from '~lib/network';
import { DerivePosition } from '~lib/schema';
import { stall } from '~lib/utils';
import { BtcAddressType, WalletPathSchema } from "~lib/wallet";


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
  pathSchema: Omit<LedgerPathSchema, 'description'>,
  type: 'hid' | 'ble' = 'hid',
): Promise<[LedgerAppBtc, string]> {
  const transport = await getLedgerTransport(type)
  const appBtc = new LedgerAppBtc(transport)
  const { bitcoinAddress: hash } = await appBtc.getWalletPublicKey(
    pathSchema.pathTemplate,
    { format: pathSchema.addressFormat! }
  )
  return [appBtc, `${hash}-${pathSchema.derivePosition}`]
}

export async function getLedgerEthApp(
  pathSchema: WalletPathSchema,
  type: 'hid' | 'ble' = 'hid',
): Promise<[LedgerAppEth, string]> {
  const transport = await getLedgerTransport(type)
  const appEth = new LedgerAppEth(transport)
  const appCfg = await Promise.race([appEth.getAppConfiguration(), stall(3000)])
  if (!appCfg) {
    throw new Error('TransportStatusError: Ledger device: UNKNOWN_ERROR')
  }
  console.log('ledger app configuration:', appCfg)
  const { address: hash } = await appEth.getAddress(pathSchema.pathTemplate)
  return [appEth, `${hash}-${pathSchema.derivePosition}`]
}

export async function getLedgerCosmApp(
  pathSchema: WalletPathSchema,
  type: 'hid' | 'ble' = 'hid',
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
  const { address: hash } = await appCosm.getAddress(
    pathSchema.pathTemplate,
    'cosmos'
  )
  return [appCosm, `${hash}-${pathSchema.derivePosition}`]
}

export async function getLedgerAddress(
  app: LedgerAppBtc | LedgerAppEth | LedgerAppCosmos,
  pathSchema: LedgerPathSchema,
  path: string,
  prefix: string = 'cosmos'
): Promise<{
  publicKey: string
  address: string
}> {
  if (app instanceof LedgerAppBtc) {
    return await app
      .getWalletPublicKey(path, {
        format: pathSchema.addressFormat!
      })
      .then(({ publicKey, bitcoinAddress }) => ({
        publicKey,
        address: bitcoinAddress
      }))
  } else if (app instanceof LedgerAppEth) {
    return await app.getAddress(path)
  } else if (app instanceof LedgerAppCosmos) {
    return await app.getAddress(path, prefix!)
  }
  return {} as any
}

export interface LedgerPathSchema extends WalletPathSchema {
  description: string
  addressFormat?: AddressFormat
}

export function toAddressFormat(addressType: BtcAddressType): AddressFormat {
  switch (addressType) {
    case BtcAddressType.LEGACY:
      return 'legacy'
    case BtcAddressType.NESTED_SEGWIT:
      return 'p2sh'
    case BtcAddressType.NATIVE_SEGWIT:
      return 'bech32'
    case BtcAddressType.TAPROOT:
      return 'bech32m'
  }
}

export const LEDGER_PATH_SCHEMAS = new Map<NetworkKind, LedgerPathSchema[]>([
  [
    NetworkKind.BTC,
    [
      {
        description: 'Legacy (BIP44 Standard)',
        pathTemplate: "m/44'/0'/0'/0/0",
        derivePosition: DerivePosition.ACCOUNT,
        addressFormat: 'legacy'
      },
      {
        description: 'Nested SegWit (BIP49 Standard)',
        pathTemplate: "m/49'/0'/0'/0/0",
        derivePosition: DerivePosition.ACCOUNT,
        addressFormat: 'p2sh'
      },
      {
        description: 'Native SegWit (BIP84 Standard)',
        pathTemplate: "m/84'/0'/0'/0/0",
        derivePosition: DerivePosition.ACCOUNT,
        addressFormat: 'bech32'
      },
      {
        description: 'Taproot (BIP84 Standard)',
        pathTemplate: "m/86'/0'/0'/0/0",
        derivePosition: DerivePosition.ACCOUNT,
        addressFormat: 'bech32m'
      }
    ]
  ],
  [
    NetworkKind.EVM,
    [
      {
        description: 'Ledger Live',
        pathTemplate: "m/44'/60'/0'/0/0",
        derivePosition: DerivePosition.ACCOUNT
      },
      {
        description: 'BIP44 Standard (e.g., Archmage, MetaMask)',
        pathTemplate: "m/44'/60'/0'/0/0",
        derivePosition: DerivePosition.ADDRESS_INDEX
      },
      {
        description: 'Legacy (MEW / MyCrypto)',
        pathTemplate: "m/44'/60'/0'/0",
        derivePosition: DerivePosition.CHANGE
      }
    ]
  ],
  [
    NetworkKind.COSM,
    [
      {
        description: 'BIP44 Standard',
        pathTemplate: "m/44'/118'/0'/0/0",
        derivePosition: DerivePosition.ADDRESS_INDEX
      }
    ]
  ]
])
