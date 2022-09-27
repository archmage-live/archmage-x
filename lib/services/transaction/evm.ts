import { TransactionResponse } from '@ethersproject/abstract-provider'
import { Logger } from '@ethersproject/logger'
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
import { useAsyncRetry } from 'react-use'
import browser from 'webextension-polyfill'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { EXTENSION } from '~lib/extension'
import { NetworkKind } from '~lib/network'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IChainAccount, INetwork, IPendingTx, ITransaction } from '~lib/schema'
import {
  ETHERSCAN_API,
  EtherscanTxResponse
} from '~lib/services/datasource/etherscan'
import { NETWORK_SERVICE, getNetworkInfo } from '~lib/services/network'
import {
  EvmProvider,
  parseEvmFunctionSignature
} from '~lib/services/provider/evm'

import { TransactionInfo, TransactionStatus, TransactionType } from './'

export enum EvmTxType {
  NORMAL = 'normal',
  INTERNAL = 'internal',
  ERC20 = 'erc20',
  ERC721 = 'erc721',
  ERC1155 = 'erc1155'
}

export interface EvmPendingTxInfo {
  tx: Omit<TransactionResponse, 'wait' | 'raw' | 'confirmations'>

  request: TransactionRequest
  origin: string
}

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
      try {
        name = parseEvmFunctionSignature(info.etherscanTx.functionName).name
      } catch {}
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

function formatTransactions<T extends ITransaction | IPendingTx>(
  txs: T[]
): T[] {
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
  addPendingTx(
    account: IChainAccount,
    request: TransactionRequest,
    tx: TransactionResponse,
    origin?: string,
    replace?: boolean
  ): Promise<IPendingTx>

  waitForTx(
    transaction: IPendingTx,
    tx: TransactionResponse,
    confirmations: number
  ): Promise<ITransaction | undefined>

  getPendingTx(id: number): Promise<IPendingTx | undefined>

  getTransaction(id: number): Promise<ITransaction | undefined>

  getPendingTxCount(account: IChainAccount): Promise<number>

  getTransactionCount(account: IChainAccount, type: string): Promise<number>

  getPendingTxs(
    account: IChainAccount,
    limit?: number,
    lastNonce?: number
  ): Promise<IPendingTx[]>

  getTransactions(
    account: IChainAccount,
    type: string,
    limit?: number,
    lastIndex1?: number,
    lastIndex2?: number
  ): Promise<ITransaction[]>

  fetchTransactions(
    account: IChainAccount,
    type: string
  ): Promise<number | undefined>

  notifyTransaction(
    transaction: ITransaction,
    explorerUrl?: string
  ): Promise<void>
}

// @ts-ignore
class EvmTransactionServicePartial implements IEvmTransactionService {
  protected normalizeTx<T extends ITransaction | IPendingTx>(
    transaction: T,
    tx: TransactionResponse
  ) {
    delete (tx as any).wait
    delete (tx as any).raw
    delete (tx as any).confirmations
    transaction.info.tx = tx
    return transaction
  }

  protected normalizeTxAndReceipt(
    transaction: ITransaction,
    tx: TransactionResponse,
    receipt?: TransactionReceipt
  ) {
    transaction = this.normalizeTx(transaction, tx)

    if (receipt) {
      delete (receipt as any).confirmations
    }
    transaction.info.receipt = receipt

    return transaction
  }

  protected newPendingTx({
    account,
    tx,
    request,
    origin
  }: {
    account: IChainAccount
    tx: TransactionResponse
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
        request,
        origin
      } as EvmPendingTxInfo
    } as IPendingTx

    transaction = this.normalizeTx(transaction, tx)

    return transaction
  }

  protected newTransaction({
    account,
    type,
    tx,
    etherscanTx,
    receipt,
    request,
    origin
  }: {
    account: IChainAccount
    type: string
    tx: TransactionResponse
    etherscanTx?: EtherscanTxResponse
    receipt?: TransactionReceipt
    request?: TransactionRequest
    origin?: string
  }) {
    assert(etherscanTx || receipt)

    let blockNumber, transactionIndex
    if (receipt) {
      blockNumber = receipt.blockNumber
      transactionIndex = receipt.transactionIndex
    } else {
      blockNumber = etherscanTx!.blockNumber
      transactionIndex = etherscanTx!.transactionIndex
    }

    let transaction = {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      type,
      index1: blockNumber,
      index2: transactionIndex,
      info: {
        etherscanTx,
        request,
        origin
      } as EvmTransactionInfo
    } as ITransaction

    transaction = this.normalizeTxAndReceipt(transaction, tx, receipt)

    return transaction
  }

  async getPendingTx(id: number): Promise<IPendingTx | undefined> {
    return DB.pendingTxs.get(id)
  }

  async getTransaction(id: number): Promise<ITransaction | undefined> {
    return DB.transactions.get(id)
  }

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
    limit: number = 100,
    lastNonce?: number
  ): Promise<IPendingTx[]> {
    if (!account.address) {
      return []
    }
    return DB.pendingTxs
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
      .reverse()
      .limit(limit)
      .toArray()
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
    return DB.transactions
      .where('[masterId+index+networkKind+chainId+address+type+index1+index2]')
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
          lastIndex1 !== undefined && lastIndex1 !== null
            ? lastIndex1
            : Dexie.maxKey,
          lastIndex2 !== undefined && lastIndex2 !== null
            ? lastIndex2
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
  private inCheck: boolean = false

  constructor() {
    super()

    browser.alarms.create('checkPendingTxs', {
      delayInMinutes: 1,
      periodInMinutes: 1
    })
    browser.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name !== 'checkPendingTxs') {
        return
      }
      if (this.inCheck) {
        return
      }
      this.inCheck = true
      try {
        await this.checkPendingTxs()
      } catch (err) {
        console.error('checkPendingTxs:', err)
      }
      this.inCheck = false
    })
  }

  async checkPendingTxs() {
    while (true) {
      const pendingTx = await DB.pendingTxs
        .where('networkKind')
        .equals(NetworkKind.EVM)
        .first()
      if (!pendingTx) {
        break
      }

      const info = pendingTx.info as EvmPendingTxInfo
      const tx = await this.waitForTx(pendingTx, info.tx as TransactionResponse)
      if (!tx) {
        return
      }
    }
  }

  async addPendingTx(
    account: IChainAccount,
    request: TransactionRequest,
    tx: TransactionResponse,
    origin?: string,
    replace = false
  ): Promise<IPendingTx> {
    assert(account.address)

    const pendingTx = this.newPendingTx({ account, tx, request, origin })

    await DB.transaction('rw', [DB.pendingTxs], async () => {
      if (replace) {
        const existing = await DB.pendingTxs
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
          pendingTx.id = existing.id
        }
      }

      pendingTx.id = await DB.pendingTxs.put(pendingTx)
    })

    const _ = this.waitForTx(pendingTx, tx)

    return pendingTx
  }

  async waitForTx(
    pendingTx: IPendingTx,
    tx: TransactionResponse,
    confirmations = 1
  ): Promise<ITransaction | undefined> {
    const waitKey = `${pendingTx.masterId}-${pendingTx.index}-${pendingTx.networkKind}-${pendingTx.chainId}-${pendingTx.address}-${pendingTx.nonce}`
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

    const transaction = await this._waitForTx(pendingTx, tx, confirmations)

    this.waits.delete(waitKey)
    resolve(transaction)

    return transaction
  }

  async _waitForTx(
    pendingTx: IPendingTx,
    tx: TransactionResponse,
    confirmations = 1
  ): Promise<ITransaction | undefined> {
    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId: pendingTx.chainId
    })
    if (!network) {
      await DB.pendingTxs.delete(pendingTx.id)
      return
    }
    const provider = await EvmProvider.from(network)

    if (!tx.wait) {
      tx = await provider.getTransaction(tx.hash)
      if (!tx) {
        return
      }
    }

    console.log('wait for transaction:', tx.hash)

    let receipt
    try {
      receipt = await tx.wait(confirmations)
    } catch (err: any) {
      if (err.code === Logger.errors.CALL_EXCEPTION && err.receipt) {
        receipt = err.receipt
      } else {
        throw err
      }
    }

    if (receipt.transactionHash !== tx.hash) {
      // tx replacement occurred
      tx = await provider.getTransaction(receipt.transactionHash)
    }

    let transaction = await DB.transactions
      .where({
        masterId: pendingTx.masterId,
        index: pendingTx.index,
        networkKind: pendingTx.networkKind,
        chainId: pendingTx.chainId,
        address: pendingTx.address,
        type: EvmTxType.NORMAL,
        index1: receipt.blockNumber,
        index2: receipt.transactionIndex
      })
      .first()

    if (!transaction) {
      transaction = this.newTransaction({
        account: pendingTx as IChainAccount,
        type: EvmTxType.NORMAL,
        tx,
        receipt
      })
    } else {
      transaction = this.normalizeTxAndReceipt(transaction, tx, receipt)
    }

    const info = pendingTx.info as EvmPendingTxInfo
    const txInfo = transaction.info as EvmTransactionInfo
    txInfo.request = info.request
    txInfo.origin = info.origin

    await DB.transaction('rw', [DB.pendingTxs, DB.transactions], async () => {
      assert(transaction)
      if (transaction.id === undefined) {
        transaction.id = await DB.transactions.add(transaction)
      } else {
        await DB.transactions.update(transaction.id, { info: transaction.info })
      }

      await DB.pendingTxs.delete(pendingTx.id)
    })

    await this.notifyTransaction(
      transaction,
      network && getNetworkInfo(network).explorerUrl
    )

    return transaction
  }

  private async _findCursorForFetchTransactions(
    account: IChainAccount,
    type: string
  ): Promise<ITransaction | undefined> {
    const limit = 100
    let lastIndex1: number | undefined = undefined
    let lastIndex2: number | undefined = undefined
    while (true) {
      const txs: ITransaction[] = await this.getTransactions(
        account,
        type,
        limit,
        lastIndex1,
        lastIndex2
      )
      if (!txs.length) {
        break
      }
      const cursorTx = txs.find(
        (tx) => (tx.info as EvmTransactionInfo).fetchedCursor
      )
      if (cursorTx) {
        return cursorTx
      }
      if (txs.length < limit) {
        break
      }
      const lastTx = txs[txs.length - 1]
      lastIndex1 = lastTx.index1
      lastIndex2 = lastTx.index2
    }
    return undefined
  }

  async fetchTransactions(account: IChainAccount, type: string) {
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

    const etherscanProvider = ETHERSCAN_API.getProvider(network)
    if (!etherscanProvider) {
      return
    }

    const lastCursorTx = await this._findCursorForFetchTransactions(
      account,
      type
    )
    const startBlock = lastCursorTx
      ? (lastCursorTx.info as EvmTransactionInfo).tx.blockNumber! + 1
      : 0

    let transactions = await etherscanProvider.getTransactions(
      account.address,
      startBlock
    )
    if (!transactions.length) {
      return
    }

    const index1Max = transactions[0][1].blockNumber
    const index2Max = transactions[0][1].transactionIndex
    const index1Min = transactions[transactions.length - 1][1].blockNumber
    const index2Min = transactions[transactions.length - 1][1].transactionIndex

    const existing = await DB.transactions
      .where('[masterId+index+networkKind+chainId+address+type+index1+index2]')
      .between(
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          type,
          index1Min,
          index2Min
        ],
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          type,
          index1Max,
          index2Max
        ],
        true,
        true
      )
      .reverse()
      .toArray()

    const existingMap = new Map(
      existing.map((tx) => [`${tx.index1}-${tx.index2}`, tx])
    )

    const bulkAdd: ITransaction[] = []
    const bulkUpdate: ITransaction[] = []
    for (const [tx, etherscanTx] of transactions) {
      const existing = existingMap.get(
        `${etherscanTx.blockNumber}-${etherscanTx.transactionIndex}`
      )
      if (!existing) {
        bulkAdd.push(this.newTransaction({ account, type, tx, etherscanTx }))
      } else {
        const info = existing.info as EvmTransactionInfo
        if (
          !info.etherscanTx ||
          info.etherscanTx.txreceipt_status !== etherscanTx.txreceipt_status
        ) {
          info.etherscanTx = etherscanTx
          bulkUpdate.push(existing)
        }
      }
    }

    await DB.transaction('rw', [DB.transactions], async () => {
      if (bulkAdd.length) {
        await DB.transactions.bulkAdd(bulkAdd)
      }

      if (bulkUpdate.length) {
        await DB.transactions.bulkPut(bulkUpdate)
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
            type,
            index1: index1Max,
            index2: index2Max
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

    return transactions.length
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

    EXTENSION.showNotification(
      title,
      message,
      explorerUrl?.length ? `${explorerUrl}/tx/${info.tx.hash}` : undefined
    )
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

export function useEvmPendingTxCount(account?: IChainAccount) {
  return useLiveQuery(() => {
    if (account === undefined) {
      return
    }
    return EVM_TRANSACTION_SERVICE.getPendingTxCount(account)
  }, [account])
}

export function useEvmTransactionCount(type: string, account?: IChainAccount) {
  return useLiveQuery(() => {
    if (account === undefined) {
      return
    }
    return EVM_TRANSACTION_SERVICE.getTransactionCount(account, type)
  }, [account, type])
}

export function useEvmPendingTxs(
  network?: INetwork,
  account?: IChainAccount,
  count?: number
) {
  return useLiveQuery(async () => {
    if (account === undefined || count === undefined) {
      return
    }
    return formatTransactions(
      await EVM_TRANSACTION_SERVICE.getPendingTxs(account, count)
    )
  }, [account, count])
}

export function useEvmTransactions(
  type: string,
  network?: INetwork,
  account?: IChainAccount,
  count?: number
) {
  const { value, retry, loading } = useAsyncRetry(async () => {
    if (network === undefined || account === undefined) {
      return
    }
    try {
      return await EVM_TRANSACTION_SERVICE.fetchTransactions(account, type)
    } catch (e) {
      console.error(e)
    }
  }, [type, network, account])

  useEffect(() => {
    if (!loading && typeof value === 'number' && value > 0) {
      retry()
    }
  }, [value, retry, loading])

  return useLiveQuery(async () => {
    if (account === undefined || count === undefined) {
      return
    }
    return formatTransactions(
      await EVM_TRANSACTION_SERVICE.getTransactions(account, type, count)
    )
  }, [type, account, count])
}
