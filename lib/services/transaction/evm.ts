import { TransactionResponse } from '@ethersproject/abstract-provider'
import {
  Formatter,
  TransactionReceipt,
  TransactionRequest
} from '@ethersproject/providers'
import assert from 'assert'
import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { ethers } from 'ethers'
import { useEffect } from 'react'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { EXTENSION } from '~lib/extension'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IChainAccount, INetwork, ITransaction } from '~lib/schema'
import {
  ETHERSCAN_API,
  EtherscanTxResponse
} from '~lib/services/datasource/etherscan'
import { NETWORK_SERVICE } from '~lib/services/network'
import { EvmProvider } from '~lib/services/provider/evm'

import { TransactionInfo, TransactionStatus, TransactionType } from './'

export interface EvmTransactionInfo {
  tx: Omit<TransactionResponse, 'wait' | 'raw' | 'confirmations'>
  receipt?: Omit<TransactionReceipt, 'confirmations'> // only exists for confirmed transaction, but may absent for Etherscan API available transaction
  etherscanTx?: EtherscanTxResponse // only exists for Etherscan API available transaction
  request?: TransactionRequest // only exists for local sent transaction
  origin?: string // only exists for local sent transaction
  fetchedCursor?: boolean // indication of last Etherscan tx history fetch
}

export function getEvmTransactionInfo(
  transaction: ITransaction
): TransactionInfo {
  const info = transaction.info as EvmTransactionInfo

  let type, name
  if ((info.tx as any).creates || !info.tx.to) {
    type = TransactionType.DeployContract
    name = 'Deploy Contract'
  } else if (!info.tx.data || info.tx.data.toLowerCase() === '0x') {
    type = TransactionType.Send
    name = 'Send'
  } else {
    type = TransactionType.CallContract
    if (info.etherscanTx?.functionName) {
      name = info.etherscanTx.functionName.split('(')[0]
      if (name) {
        name = name[0].toUpperCase() + name.slice(1)
      }
    } else if (info.etherscanTx?.methodId) {
      name = info.etherscanTx.methodId
    } else {
      name = 'Contract Interaction'
    }
  }

  let status
  if (!info.receipt && !info.etherscanTx) {
    status = TransactionStatus.PENDING
  } else if (
    info.receipt?.status === 0 ||
    info.etherscanTx?.txreceipt_status === '0'
  ) {
    status = TransactionStatus.CONFIRMED_FAILURE
  } else {
    status = TransactionStatus.CONFIRMED
  }

  let timestamp
  if (info.tx.timestamp !== undefined) {
    timestamp = info.tx.timestamp * 1000
  }

  return {
    type,
    name,
    to: info.tx.to,
    origin: info.origin,
    amount: info.tx.value.toString(),
    status,
    timestamp
  } as TransactionInfo
}

function formatTransactions(txs: ITransaction[]): ITransaction[] {
  const formatter = new Formatter()
  return txs.map((tx) => {
    const info = tx.info as EvmTransactionInfo
    if (info.tx) {
      const tx = formatter.transactionResponse(info.tx)
      info.tx = {
        ...tx,
        timestamp: info.tx.timestamp
      }
    }
    if (info.receipt) {
      info.receipt = formatter.receipt(info.receipt)
    }
    if (info.request) {
      info.request = formatter.transactionRequest(info.request)
    }
    return tx
  })
}

interface IEvmTransactionService {
  addTransaction(
    account: IChainAccount,
    request: TransactionRequest,
    tx: TransactionResponse,
    replace?: boolean,
    origin?: string
  ): Promise<ITransaction>

  waitForTransaction(
    transaction: ITransaction,
    tx: TransactionResponse,
    provider: EvmProvider,
    confirmations: number
  ): Promise<ITransaction>

  getTransaction(
    idOrTx: number | ITransaction,
    provider: EvmProvider
  ): Promise<ITransaction | undefined>

  getTransactionCount(account: IChainAccount): Promise<number>

  getTransactions(
    account: IChainAccount,
    lastNonce?: number,
    limit?: number
  ): Promise<ITransaction[]>

  fetchTransactions(account: IChainAccount): Promise<void>

  notifyTransaction(
    transaction: ITransaction,
    explorerUrl?: string
  ): Promise<void>
}

// @ts-ignore
class EvmTransactionServicePartial implements IEvmTransactionService {
  protected normalizeTransaction(
    transaction: ITransaction,
    tx: TransactionResponse,
    receipt?: TransactionReceipt
  ) {
    delete (tx as any).wait
    delete (tx as any).raw
    delete (tx as any).confirmations
    if (receipt) {
      delete (receipt as any).confirmations
    }

    transaction.info.tx = tx
    transaction.info.receipt = receipt
    return transaction
  }

  protected newTransaction({
    account,
    tx,
    etherscanTx,
    receipt,
    request,
    origin
  }: {
    account: IChainAccount
    tx: TransactionResponse
    etherscanTx?: EtherscanTxResponse
    receipt?: TransactionReceipt
    request?: TransactionRequest
    origin?: string
  }) {
    assert(account.address === ethers.utils.getAddress(tx.from))

    let transaction = {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      nonce: tx.nonce,
      info: {
        etherscanTx,
        request,
        origin
      } as EvmTransactionInfo
    } as ITransaction

    transaction = this.normalizeTransaction(transaction, tx, receipt)

    return transaction
  }

  async getTransaction(
    idOrTx: number | ITransaction,
    provider: EvmProvider
  ): Promise<ITransaction | undefined> {
    let transaction =
      typeof idOrTx === 'number' ? await DB.transactions.get(idOrTx) : idOrTx
    if (!transaction) {
      return undefined
    }
    const info = transaction.info as EvmTransactionInfo

    // fetch latest tx and receipt
    const tx = await provider.getTransaction(info.tx.hash)
    const receipt = await provider.getTransactionReceipt(info.tx.hash)
    transaction = this.normalizeTransaction(transaction, tx, receipt)

    return transaction
  }

  async getTransactionCount(account: IChainAccount): Promise<number> {
    if (!account.address) {
      return 0
    }
    return DB.transactions
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

  async getTransactions(
    account: IChainAccount,
    lastNonce?: number,
    limit: number = 100
  ): Promise<ITransaction[]> {
    if (!account.address) {
      return []
    }
    return DB.transactions
      .where('[masterId+index+networkKind+chainId+address+nonce]')
      .between(
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          0
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
      .reverse()
      .limit(limit)
      .toArray()
  }
}

export class EvmTransactionService extends EvmTransactionServicePartial {
  private waits: Map<string, Promise<ITransaction>> = new Map()

  async addTransaction(
    account: IChainAccount,
    request: TransactionRequest,
    tx: TransactionResponse,
    replace = false,
    origin?: string
  ): Promise<ITransaction> {
    assert(account.address)

    const transaction = this.newTransaction({ account, tx, request, origin })

    await DB.transaction('rw', [DB.transactions], async () => {
      if (replace) {
        const existing = await DB.transactions
          .where({
            masterId: account.masterId,
            index: account.index,
            networkKind: account.networkKind,
            chainId: account.chainId,
            address: account.address,
            nonce: tx.nonce
          })
          .first()
        if (existing) {
          transaction.id = existing.id
        }
      }

      transaction.id = await DB.transactions.put(transaction)
    })

    return transaction
  }

  async waitForTransaction(
    transaction: ITransaction,
    tx: TransactionResponse,
    provider: EvmProvider,
    confirmations = 1
  ): Promise<ITransaction> {
    const waitKey = `${transaction.masterId}-${transaction.index}-${transaction.networkKind}-${transaction.chainId}-${transaction.address}-${transaction.nonce}`
    const wait = this.waits.get(waitKey)
    if (wait) {
      return wait
    }

    let resolve: any = undefined
    this.waits.set(
      waitKey,
      new Promise((r) => {
        resolve = r
      })
    )

    if (!tx.wait) {
      tx = await provider.getTransaction(tx.hash)
    }

    const receipt = await tx.wait(confirmations)

    if (receipt.transactionHash !== tx.hash) {
      // tx replacement occurred
      tx = await provider.getTransaction(receipt.transactionHash)
    }

    transaction = this.normalizeTransaction(transaction, tx, receipt)

    await DB.transactions.update(transaction.id, { info: transaction.info })

    this.waits.delete(waitKey)
    resolve(transaction)

    return transaction
  }

  private async _findCursorForFetchTransactions(
    account: IChainAccount
  ): Promise<ITransaction | undefined> {
    const limit = 100
    let lastNonce: number | undefined = undefined
    while (true) {
      const transactions = await this.getTransactions(account, lastNonce, limit)
      if (!transactions.length) {
        break
      }
      const cursorTx = transactions.find(
        (tx) => (tx.info as EvmTransactionInfo).fetchedCursor
      )
      if (cursorTx) {
        return cursorTx
      }
      if (transactions.length < limit) {
        break
      }
      lastNonce = transactions[transactions.length - 1].nonce as number
    }
    return undefined
  }

  async fetchTransactions(account: IChainAccount) {
    if (!account.address) {
      return
    }

    const network = await NETWORK_SERVICE.getNetwork({
      kind: account.networkKind,
      chainId: account.chainId
    })
    if (!network) {
      return
    }

    const provider = await EvmProvider.from(network)

    const etherscanProvider = ETHERSCAN_API.getProvider(network)
    if (!etherscanProvider) {
      return
    }

    const lastCursorTx = await this._findCursorForFetchTransactions(account)
    const startBlock = lastCursorTx
      ? (lastCursorTx.info as EvmTransactionInfo).tx.blockNumber! + 1
      : 0

    let transactions = await etherscanProvider.getTransactions(
      account.address,
      startBlock
    )
    // bypass received tx
    transactions = transactions.filter(
      (tx) => ethers.utils.getAddress(tx[0].from) === account.address
    )
    if (!transactions.length) {
      return
    }
    const nonceMin = transactions[transactions.length - 1][0].nonce
    const nonceMax = transactions[0][0].nonce

    const existing = await DB.transactions
      .where('[masterId+index+networkKind+chainId+address+nonce]')
      .between(
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          nonceMin
        ],
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          nonceMax
        ],
        true,
        true
      )
      .reverse()
      .toArray()

    const existingMap = new Map(existing.map((tx) => [tx.nonce, tx]))

    const bulkAdd: ITransaction[] = []
    const bulkUpdate: [ITransaction, TransactionResponse][] = []
    for (const [tx, etherscanTx] of transactions) {
      const existing = existingMap.get(tx.nonce)
      if (!existing) {
        bulkAdd.push(this.newTransaction({ account, tx, etherscanTx }))
      } else {
        const info = existing.info as EvmTransactionInfo
        if (
          info.request &&
          (!info.receipt ||
            info.receipt.status !== +etherscanTx.txreceipt_status)
        ) {
          info.etherscanTx = etherscanTx
          bulkUpdate.push([existing, tx])
        }
      }
    }

    await DB.transaction('rw', [DB.transactions], async () => {
      if (bulkAdd.length) {
        await DB.transactions.bulkAdd(bulkAdd)
      }

      // add new cursor
      {
        const cursorTx = await DB.transactions
          .where({
            masterId: account.masterId,
            index: account.index,
            networkKind: account.networkKind,
            chainId: account.chainId,
            address: account.address,
            nonce: nonceMax
          })
          .first()
        assert(cursorTx)

        const info = cursorTx.info as EvmTransactionInfo
        info.fetchedCursor = true
        await DB.transactions.update(cursorTx.id, { info })
      }

      // delete old cursor
      if (lastCursorTx) {
        const info = lastCursorTx.info as EvmTransactionInfo
        delete info.fetchedCursor
        await DB.transactions.update(lastCursorTx.id, { info })
      }
    })

    // do the best one can
    for (const [transaction, tx] of bulkUpdate) {
      await this.waitForTransaction(transaction, tx, provider)
    }
  }

  async notifyTransaction(transaction: ITransaction, explorerUrl?: string) {
    const info = transaction.info as EvmTransactionInfo
    const success = info.receipt!.status !== 0
    const nonce = info.tx.nonce

    const title = success ? 'Confirmed transaction' : 'Failed transaction'
    const message = success
      ? `Transaction ${nonce} confirmed! ${
          explorerUrl?.length ? 'View on block explorer' : ''
        }`
      : `Transaction ${nonce} failed! Transaction encountered an error.`

    EXTENSION.showNotification(title, message, explorerUrl)
  }
}

function createEvmTransactionService(): IEvmTransactionService {
  const serviceName = 'evmTransactionService'
  let service
  if (ENV.inServiceWorker) {
    service = new EvmTransactionService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
  } else {
    service = SERVICE_WORKER_CLIENT.service<IEvmTransactionService>(
      serviceName,
      // @ts-ignore
      new EvmTransactionServicePartial()
    )
  }
  return service
}

export const EVM_TRANSACTION_SERVICE = createEvmTransactionService()

export function useEvmTransactionCount(account?: IChainAccount) {
  return useLiveQuery(() => {
    if (account === undefined) {
      return
    }
    return EVM_TRANSACTION_SERVICE.getTransactionCount(account)
  }, [account])
}

export function useEvmTransactions(
  network?: INetwork,
  account?: IChainAccount,
  count?: number
) {
  useEffect(() => {
    const effect = async () => {
      if (network === undefined || account === undefined) {
        return
      }
      await EVM_TRANSACTION_SERVICE.fetchTransactions(account)
    }
    effect()
  }, [network, account])

  return useLiveQuery(async () => {
    if (account === undefined || count === undefined) {
      return
    }
    return formatTransactions(
      await EVM_TRANSACTION_SERVICE.getTransactions(account, undefined, count)
    )
  }, [account, count])
}
