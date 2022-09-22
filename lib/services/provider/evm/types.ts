import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { BytesLike } from '@ethersproject/bytes'
import { AccessListish } from '@ethersproject/transactions'

export type EvmTxParams = {
  to?: string
  from?: string
  nonce?: BigNumberish // ignored

  gasLimit?: BigNumberish // gas limit
  gasPrice?: BigNumberish

  data?: BytesLike
  value?: BigNumberish
  chainId?: number

  type?: number
  accessList?: AccessListish

  maxPriorityFeePerGas?: BigNumberish
  maxFeePerGas?: BigNumberish
}

export type EvmTxPopulatedParams = {
  gasPrice?: BigNumberish
  maxPriorityFeePerGas?: BigNumberish
  maxFeePerGas?: BigNumberish
  code?: string
  error?: string
}

export const allowedTransactionKeys: Array<string> = [
  'accessList',
  'chainId',
  'data',
  'from',
  'gas',
  'gasLimit',
  'gasPrice',
  'maxFeePerGas',
  'maxPriorityFeePerGas',
  'nonce',
  'to',
  'type',
  'value'
]

export function formatEvmTxParams(
  params?: EvmTxParams,
  populatedParams?: EvmTxPopulatedParams
) {
  if (params) {
    if (params.nonce) params.nonce = BigNumber.from(params.nonce)
    if (params.gasLimit) params.gasLimit = BigNumber.from(params.gasLimit)
    if (params.gasPrice) params.gasPrice = BigNumber.from(params.gasPrice)
    if (params.value) params.value = BigNumber.from(params.value)
    if (params.maxPriorityFeePerGas)
      params.maxPriorityFeePerGas = BigNumber.from(params.maxPriorityFeePerGas)
    if (params.maxFeePerGas)
      params.maxFeePerGas = BigNumber.from(params.maxFeePerGas)
  }

  if (populatedParams) {
    if (populatedParams.gasPrice)
      populatedParams.gasPrice = BigNumber.from(populatedParams.gasPrice)
    if (populatedParams.maxPriorityFeePerGas)
      populatedParams.maxPriorityFeePerGas = BigNumber.from(
        populatedParams.maxPriorityFeePerGas
      )
    if (populatedParams.maxFeePerGas)
      populatedParams.maxFeePerGas = BigNumber.from(
        populatedParams.maxFeePerGas
      )
  }
}
