import { NetworkKind } from '~lib/network'

export interface IWalletInfo {
  id?: number
  masterId: number // master wallet id
  index: number | undefined // derived wallet index; undefined or -1 for imported single wallet
  networkKind: NetworkKind
  chainId: number | string
  address: string
  info: any
}

export const walletInfoSchemaV1 =
  '++id, &[masterId+index+networkKind+chainId], &[masterId+networkKind+chainId+index], address'

export function reconcileWalletInfo(wallet?: IWalletInfo) {
  if (wallet && wallet.index === -1) {
    wallet.index = undefined
  }
  return wallet
}
