import { BigNumberish } from '@ethersproject/bignumber'
import { BytesLike } from '@ethersproject/bytes'
import { AccessListish } from '@ethersproject/transactions'

export type TransactionParams = {
  to?: string
  from?: string
  // nonce?: BigNumberish

  gasLimit?: BigNumberish
  gas?: BigNumberish // alias for gasLimit
  gasPrice?: BigNumberish

  data?: BytesLike
  value?: BigNumberish
  chainId?: number

  type?: number
  accessList?: AccessListish

  maxPriorityFeePerGas?: BigNumberish
  maxFeePerGas?: BigNumberish
}
