import { FunctionFragment } from '@ethersproject/abi'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { getAddress } from '@ethersproject/address'
import { hexlify } from '@ethersproject/bytes'
import { Logger } from '@ethersproject/logger'
import { shallowCopy } from '@ethersproject/properties'
import {
  Formatter,
  TransactionReceipt,
  TransactionRequest
} from '@ethersproject/providers'
import assert from 'assert'
import { useAsync } from 'react-use'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { EXTENSION } from '~lib/extension'
import { NetworkKind } from '~lib/network'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IChainAccount, INetwork, IPendingTx, ITransaction } from '~lib/schema'
import {
  ETHERSCAN_API,
  EtherscanTxResponse,
  EvmTxType,
  useEtherScanProvider
} from '~lib/services/datasource/etherscan'
import { NETWORK_SERVICE, getNetworkInfo } from '~lib/services/network'
import { EvmClient } from '~lib/services/provider/evm/client'
import {
  parseEvmFunctionSignature,
  useEvmFunctionSignature
} from '~lib/services/provider/evm/hooks'
import { getProvider } from '~lib/services/provider/provider'
import { BaseTransactionService } from '~lib/services/transaction/baseService'

import {
  ITransactionService,
  TransactionInfo,
  TransactionStatus,
  TransactionType
} from './'

export function getEvmTransactionTypes() {
  return [
    [EvmTxType.NORMAL, 'Normal'],
    [EvmTxType.INTERNAL, 'Internal'],
    [EvmTxType.ERC20, 'ERC20'],
    [EvmTxType.ERC721, 'ERC721'],
    [EvmTxType.ERC1155, 'ERC1155']
  ] as unknown as [[string, string]]
}

export interface EvmPendingTxInfo {
  tx: Omit<TransactionResponse, 'wait' | 'raw' | 'confirmations'>

  request: TransactionRequest
  origin: string
  functionSig?: FunctionFragment
  startBlockNumber?: number
}

export interface EvmTransactionInfo {
  tx: Omit<TransactionResponse, 'wait' | 'raw' | 'confirmations'>

  receipt?: Omit<TransactionReceipt, 'confirmations'> // only exists for confirmed transaction, but may absent for Etherscan API available transaction

  etherscanTx?: EtherscanTxResponse // only exists for Etherscan API available transaction

  request?: TransactionRequest // only exists for local sent transaction
  origin?: string // only exists for local sent transaction
  functionSig?: FunctionFragment

  fetchedCursor?: boolean // indication of last Etherscan tx history fetch
}

export function isEvmPendingTxInfo(
  info: EvmPendingTxInfo | EvmTransactionInfo
): info is EvmPendingTxInfo {
  const txInfo = info as EvmTransactionInfo
  return !txInfo.receipt && !txInfo.etherscanTx
}

export function getEvmTransactionInfo(
  transaction: IPendingTx | ITransaction
): TransactionInfo {
  const info = transaction.info as EvmPendingTxInfo | EvmTransactionInfo
  const isPending = isEvmPendingTxInfo(info)

  let type, name
  if ((info.tx as any).creates || !info.tx.to) {
    type = TransactionType.DeployContract
    name = 'Deploy Contract'
  } else if (getAddress(info.tx.from) !== transaction.address) {
    type = TransactionType.Receive
    name = 'Receive'
  } else if (!info.tx.data || info.tx.data.toLowerCase() === '0x') {
    type = TransactionType.Send
    name = 'Send'
  } else {
    type = TransactionType.CallContract
    const etherscanTx = (info as EvmTransactionInfo).etherscanTx
    if (info.functionSig) {
      name = info.functionSig.name
    } else if (etherscanTx?.functionName) {
      try {
        name = parseEvmFunctionSignature(etherscanTx.functionName).name
      } catch {}
    }
    if (name) {
      name = name[0].toUpperCase() + name.slice(1)
    } else if (etherscanTx?.methodId) {
      name = etherscanTx.methodId
    } else {
      name = 'Contract Interaction'
    }
  }

  let status
  if (isPending) {
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

  const isCancelled =
    info.tx.from === info.tx.to &&
    info.tx.data.toLowerCase() === '0x' &&
    info.tx.value.isZero()

  return {
    type,
    isPending,
    isCancelled,
    name,
    to: info.tx.to,
    origin: info.origin,
    amount: info.tx.value.toString(),
    status,
    timestamp
  } as TransactionInfo
}

export function formatEvmTransactions<T extends ITransaction | IPendingTx>(
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
      const chainId = info.request.chainId
      info.request = {
        ...formatter.transactionRequest(info.request),
        chainId
      }
    }
    return tx
  })
}

interface IEvmTransactionService extends ITransactionService {
  signAndSendTx(
    account: IChainAccount,
    request: TransactionRequest,
    origin?: string,
    functionSig?: FunctionFragment,
    replace?: boolean
  ): Promise<IPendingTx>

  addPendingTx(
    account: IChainAccount,
    request: TransactionRequest,
    tx: TransactionResponse,
    origin?: string,
    functionSig?: FunctionFragment,
    replace?: boolean
  ): Promise<IPendingTx>

  waitForTx(
    transaction: IPendingTx,
    tx: TransactionResponse,
    confirmations: number
  ): Promise<ITransaction | undefined>

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
class EvmTransactionServicePartial
  extends BaseTransactionService
  implements IEvmTransactionService
{
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
    origin,
    functionSig
  }: {
    account: IChainAccount
    tx: TransactionResponse
    request?: TransactionRequest
    origin?: string
    functionSig?: FunctionFragment
  }) {
    assert(account.address === getAddress(tx.from))

    let transaction = {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      nonce: tx.nonce,
      info: {
        request,
        origin,
        functionSig
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
}

export class EvmTransactionService extends EvmTransactionServicePartial {
  async signAndSendTx(
    account: IChainAccount,
    request: TransactionRequest,
    origin?: string,
    functionSig?: FunctionFragment,
    replace?: boolean
  ): Promise<IPendingTx> {
    const network = await NETWORK_SERVICE.getNetwork({
      kind: account.networkKind,
      chainId: account.chainId
    })
    assert(network)
    const provider = await getProvider(network)
    const signedTx = await provider.signTransaction(account, request)
    const txResponse = await provider.sendTransaction(signedTx)
    return this.addPendingTx(
      account,
      request,
      txResponse,
      origin,
      functionSig,
      replace
    )
  }

  async addPendingTx(
    account: IChainAccount,
    request: TransactionRequest,
    tx: TransactionResponse,
    origin?: string,
    functionSig?: FunctionFragment,
    replace = true
  ): Promise<IPendingTx> {
    assert(account.address)

    const pendingTx = this.newPendingTx({
      account,
      tx: shallowCopy(tx),
      request,
      origin,
      functionSig
    })

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

    this.checkPendingTx(pendingTx, tx).finally()

    return pendingTx
  }

  async waitForTx(
    pendingTx: IPendingTx,
    tx?: TransactionResponse,
    confirmations = 1
  ): Promise<ITransaction | undefined> {
    assert(confirmations >= 1)

    if (!(await this.getPendingTx(pendingTx.id))) {
      return
    }

    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId: pendingTx.chainId
    })
    if (!network) {
      await DB.pendingTxs.delete(pendingTx.id)
      return
    }
    const provider = await EvmClient.from(network)

    const info = pendingTx.info as EvmPendingTxInfo
    if (!tx) {
      tx = info.tx as TransactionResponse
    }

    if ((tx as any).wait) {
      // If `wait` exists, transaction is from the immediate `sendTransaction`.
      // So we persist the start block number for later `_waitForTransaction`
      info.startBlockNumber = await provider._getInternalBlockNumber(
        500 + 2 * provider.pollingInterval
      )
      await DB.pendingTxs.update(pendingTx.id, { info })
    }

    let receipt: TransactionReceipt | undefined = undefined
    try {
      if (tx.wait) {
        receipt = await tx.wait(confirmations)
      } else if (typeof info.startBlockNumber === 'number') {
        const replacement = {
          data: tx.data,
          from: tx.from,
          nonce: tx.nonce,
          to: tx.to,
          value: tx.value,
          startBlock: info.startBlockNumber
        }
        receipt = await provider._waitForTransaction(
          tx.hash,
          confirmations,
          1000 * 60 * 5, // timeout 5m
          replacement as any
        )
      } else {
        // We don't know how to wait for this transaction, so delete it.
        // Should not happen.
        console.log('delete pending tx:', pendingTx.id)
        await DB.pendingTxs.delete(pendingTx.id)
        return
      }
    } catch (err: any) {
      if (err.code === Logger.errors.CALL_EXCEPTION && err.receipt) {
        receipt = err.receipt
      } else if (
        err.code === Logger.errors.TRANSACTION_REPLACED &&
        err.receipt
      ) {
        receipt = err.receipt
      } else if (err.code === Logger.errors.TIMEOUT) {
        info.startBlockNumber = await provider._getInternalBlockNumber(
          500 + 2 * provider.pollingInterval
        )
        await DB.pendingTxs.update(pendingTx.id, { info })

        const nonce = await provider.getTransactionCount(tx.from)
        const isMined = nonce > tx.nonce

        console.log(
          `pending tx ${pendingTx.id} will later be waited from block ${
            info.startBlockNumber
          }. ${isMined ? "It was mined but hasn't been found." : ''}`
        )

        return
      } else {
        throw err
      }
    }

    assert(receipt)
    if (
      // tx replacement occurred
      receipt.transactionHash !== tx.hash ||
      // tx mined
      receipt.blockNumber !== tx.blockNumber
    ) {
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

    const txInfo = transaction.info as EvmTransactionInfo
    txInfo.request = info.request
    txInfo.origin = info.origin
    txInfo.functionSig = info.functionSig

    if (!(await this.getPendingTx(pendingTx.id))) {
      return
    }

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
      type as EvmTxType,
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

    const pendingTxs = await this.getPendingTxs(account)
    const existingPendingMap = new Map(
      pendingTxs.map((pendingTx) => [pendingTx.nonce, pendingTx])
    )

    const bulkAdd: ITransaction[] = []
    const bulkUpdate: ITransaction[] = []
    const confirmedPending: [IPendingTx, TransactionResponse][] = []
    for (const [tx, etherscanTx] of transactions) {
      let pendingTxInfo: EvmPendingTxInfo | undefined
      if (tx.from === account.address) {
        const pendingTx = existingPendingMap.get(tx.nonce)
        if (pendingTx) {
          pendingTxInfo = pendingTx.info
          confirmedPending.push([pendingTx, tx])
        }
      }

      const existing = existingMap.get(
        `${etherscanTx.blockNumber}-${etherscanTx.transactionIndex}`
      )
      if (!existing) {
        bulkAdd.push(
          this.newTransaction({
            account,
            type,
            tx,
            etherscanTx,
            request: pendingTxInfo?.request,
            origin: pendingTxInfo?.origin
          })
        )
      } else {
        const info = existing.info as EvmTransactionInfo
        if (
          info.tx.blockNumber == null ||
          !info.etherscanTx ||
          info.etherscanTx.txreceipt_status !== etherscanTx.txreceipt_status
        ) {
          info.tx = tx
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

    for (const [pendingTx, tx] of confirmedPending) {
      await this.checkPendingTx(pendingTx, tx)
    }

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

export function useTransactionDescription(
  network?: INetwork,
  tx?: TransactionRequest
) {
  const provider = useEtherScanProvider(network)

  const { value: description } = useAsync(async () => {
    const contract = tx?.to
    const data = tx?.data?.length ? hexlify(tx.data) : undefined
    if (!provider || !contract || !data) {
      return
    }
    let iface
    try {
      iface = await provider.getAbi(contract)
    } catch {
      return
    }
    return iface.parseTransaction({ data })
  }, [provider, tx])

  const _signature = useEvmFunctionSignature(tx?.data)
  const signature = description?.functionFragment || _signature

  return {
    signature,
    description
  }
}
