import { IChainAccount } from '~lib/schema'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { AccountAbstractionType } from '~lib/wallet'

export enum Erc4337ContractAccount {
  SIMPLE_ACCOUNT = 'SimpleAccount',
  GNOSIS_ACCOUNT = 'GnosisAccount',
  ZERO_DEV_KERNEL = 'ZeroDevKernel',
  ZERO_DEV_GNOSIS_ACCOUNT = 'ZeroDevGnosisAccount'
}

export async function isErc4337Account(account: IChainAccount) {
  const wallet = await WALLET_SERVICE.getWallet(account.masterId)
  if (!wallet) {
    return false
  }

  return wallet.info.accountAbstraction?.type === AccountAbstractionType.ERC4337
}
