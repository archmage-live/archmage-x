import Dexie from 'dexie'

import { DB } from '~lib/db'
import { EXTENSION } from '~lib/extension'
import { NetworkKind } from '~lib/network'
import { IChainAccount, INetwork, IPendingTx, ITransaction } from '~lib/schema'
import { getTransactionUrl } from '~lib/services/network'
import { shortenString } from '~lib/utils'

import { TransactionStatus, decodeTransaction, getTransactionInfo } from '.'
import { PENDING_TX_CHECKER } from './check'

export abstract class BaseTransactionService {
  async getPendingTxCount(account: IChainAccount): Promise<number> {
    if (!account.address) {
      return 0
    }
    return DB.pendingTxs
      .where('[masterId+index+networkKind+chainId+address]')
      .equals([
        account.masterId,
        account.index,
        account.networkKind,
        account.chainId,
        account.address
      ])
      .count()
  }

  async getTransactionCount(
    account: IChainAccount,
    type: string
  ): Promise<number> {
    if (!account.address) {
      return 0
    }
    return DB.transactions
      .where('[masterId+index+networkKind+chainId+address+type]')
      .equals([
        account.masterId,
        account.index,
        account.networkKind,
        account.chainId,
        account.address,
        type
      ])
      .count()
  }

  async getPendingTxs(
    account: IChainAccount,
    limit?: number,
    reverse = true,
    lastNonce?: number
  ): Promise<IPendingTx[]> {
    if (!account.address) {
      return []
    }
    let collection = DB.pendingTxs
      .where('[masterId+index+networkKind+chainId+address+nonce]')
      .between(
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          Dexie.minKey
        ],
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          lastNonce !== undefined && lastNonce !== null
            ? lastNonce
            : Dexie.maxKey
        ]
      )

    collection = reverse ? collection.reverse() : collection

    collection =
      typeof limit === 'number' ? collection.limit(limit) : collection

    return (await collection.toArray()).map(
      (pendingTx) => decodeTransaction(pendingTx) as IPendingTx
    )
  }

  async getTransactions(
    account: IChainAccount,
    type: string,
    limit: number = 100,
    lastIndex1?: number,
    lastIndex2?: number
  ): Promise<ITransaction[]> {
    if (!account.address) {
      return []
    }
    return (
      await DB.transactions
        .where(
          '[masterId+index+networkKind+chainId+address+type+index1+index2]'
        )
        .between(
          [
            account.masterId,
            account.index,
            account.networkKind,
            account.chainId,
            account.address,
            type,
            Dexie.minKey,
            Dexie.minKey
          ],
          [
            account.masterId,
            account.index,
            account.networkKind,
            account.chainId,
            account.address,
            type,
            // index1 && index2 as cursor
            lastIndex1 !== undefined && lastIndex1 !== null
              ? lastIndex1
              : Dexie.maxKey,
            lastIndex2 !== undefined && lastIndex2 !== null
              ? lastIndex2
              : Dexie.maxKey
          ]
          // don't include lower or upper
        )
        .reverse() // reverse order
        .limit(limit)
        .toArray()
    ).map((tx) => decodeTransaction(tx) as ITransaction)
  }

  async getPendingTx(id: number): Promise<IPendingTx | undefined> {
    return decodeTransaction(await DB.pendingTxs.get(id)) as
      | IPendingTx
      | undefined
  }

  async getTransaction(id: number): Promise<ITransaction | undefined> {
    return decodeTransaction(await DB.transactions.get(id)) as
      | ITransaction
      | undefined
  }

  signAndSendTx(account: IChainAccount, ...args: any[]): Promise<IPendingTx> {
    // this method should be implemented by subclasses
    throw new Error('not implemented')
  }

  async checkPendingTx(
    pendingTx: IPendingTx,
    ...args: any[]
  ): Promise<ITransaction | undefined> {
    return PENDING_TX_CHECKER.checkPendingTx(pendingTx, ...args)
  }

  async notifyTransaction(network: INetwork, transaction: ITransaction) {
    const info = getTransactionInfo(transaction, network)
    const success = info.status === TransactionStatus.CONFIRMED

    // Sui doesn't use nonce
    const identifier =
      network.kind !== NetworkKind.SUI ? info.nonce : shortenString(info.hash)

    const explorerUrl = getTransactionUrl(network, info.hash)

    const title = success ? 'Confirmed transaction' : 'Failed transaction'
    const message = success
      ? `Transaction ${identifier} confirmed! ${
          explorerUrl ? 'View on explorer' : ''
        }`
      : `Transaction ${identifier} failed! Transaction encountered an error.`

    EXTENSION.showNotification(title, message, explorerUrl)
  }
}
