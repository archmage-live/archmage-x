import { NetworkKind } from '~lib/network'
import { IChainAccount, INetwork, IPendingTx, ITransaction } from '~lib/schema'

import {
  EVM_TRANSACTION_SERVICE,
  getEvmTransactionInfo,
  getEvmTransactionTypes
} from './evmService'

export interface ITransactionService {
  getPendingTxCount(account: IChainAccount): Promise<number>

  getTransactionCount(account: IChainAccount, type: string): Promise<number>

  getPendingTxs(
    account: IChainAccount,
    limit?: number,
    reverse?: boolean,
    lastNonce?: number
  ): Promise<IPendingTx[]>

  getTransactions(
    account: IChainAccount,
    type: string,
    limit?: number,
    lastIndex1?: number,
    lastIndex2?: number
  ): Promise<ITransaction[]>

  getPendingTx(id: number): Promise<IPendingTx | undefined>

  getTransaction(id: number): Promise<ITransaction | undefined>

  fetchTransactions(
    account: IChainAccount,
    type: string
  ): Promise<number | undefined>
}

export function getTransactionService(
  networkKind: NetworkKind
): ITransactionService {
  switch (networkKind) {
    case NetworkKind.EVM:
      return EVM_TRANSACTION_SERVICE
  }
  throw new Error('transaction service not found')
}

export function getTransactionTypes(networkKind: NetworkKind) {
  switch (networkKind) {
    case NetworkKind.EVM:
      return getEvmTransactionTypes()
  }
  throw new Error('getTransactionInfo not found')
}

export function getTransactionInfo(
  tx: IPendingTx | ITransaction
): TransactionInfo {
  switch (tx.networkKind) {
    case NetworkKind.EVM:
      return getEvmTransactionInfo(tx)
  }
  throw new Error('getTransactionInfo not found')
}

export interface TransactionInfo {
  type: TransactionType
  isPending: boolean
  isCancelled: boolean
  name: string
  to?: string
  origin?: string
  amount: string
  status: TransactionStatus
  timestamp?: number
}

export enum TransactionType {
  Send = 'send',
  Receive = 'receive',
  DeployContract = 'deployContract',
  CallContract = 'callContract'
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CONFIRMED_FAILURE = 'confirmedFailure'
}
