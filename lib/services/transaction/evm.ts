import { TransactionResponse } from '@ethersproject/abstract-provider'
import { TransactionReceipt } from '@ethersproject/providers'

import { DB } from '~lib/db'
import { IChainAccount, ITransaction } from '~lib/schema'

interface EvmTransactionInfo {
  tx: Omit<TransactionResponse, 'wait' | 'raw' | 'confirmations'>
  receipt: TransactionReceipt
}

export class EvmTransactionService {
  async addTransaction(account: IChainAccount, tx: TransactionResponse) {
    const receipt = await tx.wait(1)

    delete (tx as any).wait
    delete (tx as any).raw
    delete (tx as any).confirmations

    const transaction = {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      nonce: tx.nonce,
      timestamp: tx.timestamp,
      info: {
        tx: tx,
        receipt
      } as EvmTransactionInfo
    } as ITransaction

    transaction.id = await DB.transactions.add(transaction)

    return transaction
  }
}
