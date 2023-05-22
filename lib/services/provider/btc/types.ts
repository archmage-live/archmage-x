import { IChainAccount, SubChainAccount } from '~lib/schema'

export type BtcTxParams = {
  to: string
  value: number // sat

  inputTxs: string[]
  subAccounts?: BtcSubAccount[]

  feeRate?: number
  fee?: number
  psbt?: string
}

export type BtcSubAccount = {
  changeIndex: number
  addressIndex: number
  publicKey: string
  address: string
}
