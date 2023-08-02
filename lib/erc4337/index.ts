import { IChainAccount } from '~lib/schema'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { AccountAbstractionType } from '~lib/wallet'

export enum Erc4337AccountType {
  SIMPLE_ACCOUNT_V1 = 'SimpleAccountV1',
  GNOSIS_ACCOUNT_V1 = 'GnosisAccountV1',
  ZERO_DEV_KERNEL_V1 = 'ZeroDevKernelV1',
  ZERO_DEV_KERNEL_V2 = 'ZeroDevKernelV2',
  ZERO_DEV_GNOSIS_ACCOUNT_V1 = 'ZeroDevGnosisAccountV1'
}

export const ERC4337_FACTORIES = new Map([
  [
    Erc4337AccountType.SIMPLE_ACCOUNT_V1,
    '0x3d33f1267F570F18C2AEaE8cf05A9c9583F8127f'
  ],
  [
    Erc4337AccountType.ZERO_DEV_KERNEL_V1,
    '0x4E4946298614FC299B50c947289F4aD0572CB9ce'
  ],
  [
    Erc4337AccountType.ZERO_DEV_KERNEL_V2,
    '0x5D006d3880645ec6e254E18C1F879DAC9Dd71A39'
  ]
])

export async function isErc4337Account(account: IChainAccount) {
  const wallet = await WALLET_SERVICE.getWallet(account.masterId)
  if (!wallet) {
    return false
  }

  return wallet.info.accountAbstraction?.type === AccountAbstractionType.ERC4337
}
