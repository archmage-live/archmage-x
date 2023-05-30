export interface IActiveBinding {
  id: number
  origin: string // URL.origin
  tabId: number | typeof TAB_ID_NONE
  account: ActiveBindingAccount
}

export interface ActiveBindingAccount {
  walletId: number
  subWalletId: number
  networkId: number
}

export const TAB_ID_NONE = -1

export const activeBindingSchemaV1 = '++id, &[origin+tabId], &tabId'
