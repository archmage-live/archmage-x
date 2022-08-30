import { NetworkKind } from '~lib/network'
import { INetwork, ITransaction } from '~lib/schema'

import { EVM_TRANSACTION_SERVICE, getEvmTransactionInfo } from './evm'

interface ITransactionService {}

export function getTransactionService(network: INetwork): ITransactionService {
  switch (network.kind) {
    case NetworkKind.EVM:
      return EVM_TRANSACTION_SERVICE
  }
  throw new Error('transaction service not found')
}

export function getTransactionInfo(tx: ITransaction): TransactionInfo {
  switch (tx.networkKind) {
    case NetworkKind.EVM:
      return getEvmTransactionInfo(tx)
  }
  throw new Error('getTransactionInfo not found')
}

export interface TransactionInfo {
  type: TransactionType
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
