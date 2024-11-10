export interface Account {
  id: number
  walletId: number // master wallet id
  sortId: number // always 0 for single-account wallet
  index: number
  name: string // empty for single-account wallet
  // Ensure the uniqueness within the master wallet it belongs to.
  // Only exists for some wallet types, i.e., WalletType.PRIVATE_KEY_GROUP
  hash?: string
  info: {}
}

export interface ChainAccountInfo {
}
