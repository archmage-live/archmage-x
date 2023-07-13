import { FunctionFragment } from '@ethersproject/abi'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { TransactionRequest } from '@ethersproject/providers'

import { IChainAccount, IPendingTx, ITransaction } from '~lib/schema'

import { EvmBasicTransactionService } from './evmService'

export class EvmErc4337TransactionService extends EvmBasicTransactionService {
  async signAndSendTx(
    account: IChainAccount,
    request: TransactionRequest,
    origin?: string,
    functionSig?: FunctionFragment,
    replace?: boolean
  ): Promise<IPendingTx> {
    // TODO: implement replacement tx for erc4337
    throw new Error('not implemented.')
  }

  async addPendingTx(
    account: IChainAccount,
    request: TransactionRequest,
    tx: TransactionResponse,
    origin?: string,
    functionSig?: FunctionFragment,
    replace = true
  ): Promise<IPendingTx> {
    return super.addPendingTx(
      account,
      request,
      tx,
      origin,
      functionSig,
      replace
    )
  }

  async waitForTx(
    pendingTx: IPendingTx,
    tx?: TransactionResponse,
    confirmations = 1
  ): Promise<ITransaction | undefined> {
    return super.waitForTx(pendingTx, tx, confirmations)
  }

  async fetchTransactions(
    account: IChainAccount,
    type: string
  ): Promise<number | undefined> {
    // TODO
    return undefined
  }
}
