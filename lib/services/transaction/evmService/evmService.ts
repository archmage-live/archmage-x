import { FunctionFragment } from '@ethersproject/abi'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { getAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import { hexlify } from '@ethersproject/bytes'
import { Logger } from '@ethersproject/logger'
import { shallowCopy } from '@ethersproject/properties'
import {
  Formatter,
  TransactionReceipt,
  TransactionRequest
} from '@ethersproject/providers'
import assert from 'assert'

import { DB } from '~lib/db'
import { isErc4337Account } from '~lib/erc4337'
import { NetworkKind } from '~lib/network'
import { IChainAccount, IPendingTx, ITransaction } from '~lib/schema'
import {
  ETHERSCAN_API,
  EtherscanTxResponse,
  EvmTxType
} from '~lib/services/datasource/etherscan'
import { JIFFYSCAN_API, UserOp } from '~lib/services/datasource/jiffyscan'
import { NETWORK_SERVICE } from '~lib/services/network'
import {
  EvmErc4337Client,
  UserOperationReceipt,
  UserOperationResponse
} from '~lib/services/provider/evm'
import { EvmClient } from '~lib/services/provider/evm/client'
import { parseEvmFunctionSignature } from '~lib/services/provider/evm/hooks'
import { getProvider } from '~lib/services/provider/provider'
import { BaseTransactionService } from '~lib/services/transaction/baseService'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { shallowStringify } from '~lib/utils'

import {
  ITransactionService,
  TransactionInfo,
  TransactionStatus,
  TransactionType
} from '../'

export function getEvmTransactionTypes() {
  return [
    [EvmTxType.NORMAL, 'Normal'],
    [EvmTxType.INTERNAL, 'Internal'],
    [EvmTxType.ERC20, 'ERC20'],
    [EvmTxType.ERC721, 'ERC721'],
    [EvmTxType.ERC1155, 'ERC1155'],
    [EvmTxType.UserOp, 'UserOp']
  ] as unknown as [[string, string]]
}

export type ReducedTransactionResponse = Omit<
  TransactionResponse,
  'wait' | 'raw' | 'confirmations'
>
export type ReducedTransactionReceipt = Omit<
  TransactionReceipt,
  'confirmations'
>

export interface EvmPendingTxInfo {
  tx: ReducedTransactionResponse | UserOperationResponse

  request: TransactionRequest
  origin: string
  functionSig?: FunctionFragment
  startBlockNumber?: number
}

export interface EvmTransactionInfo {
  tx: ReducedTransactionResponse | UserOperationResponse

  receipt?: ReducedTransactionReceipt | UserOperationReceipt // only exists for confirmed transaction, but may absent for Etherscan API available transaction

  etherscanTx?: EtherscanTxResponse // only exists for Etherscan API available transaction
  jiffyscanUserOp?: UserOp // only exists for Jiffyscan UserOp

  request?: TransactionRequest // only exists for local sent transaction
  origin?: string // only exists for local sent transaction
  functionSig?: FunctionFragment

  fetchedCursor?: boolean // indication of last Etherscan tx history fetch
}

export function isEvmPendingTxInfo(
  info: EvmPendingTxInfo | EvmTransactionInfo
): info is EvmPendingTxInfo {
  const txInfo = info as EvmTransactionInfo
  return !txInfo.receipt && !(txInfo.etherscanTx || txInfo.jiffyscanUserOp)
}

export function isEvmTransactionInfo(
  info: EvmPendingTxInfo | EvmTransactionInfo
): info is EvmTransactionInfo {
  return !isEvmPendingTxInfo(info)
}

export function isEvmTransactionResponse(
  tx: ReducedTransactionResponse | UserOperationResponse
): tx is ReducedTransactionResponse {
  return !!(tx as ReducedTransactionResponse).from
}

export function isEvmUserOperationResponse(
  tx: ReducedTransactionResponse | UserOperationResponse
): tx is UserOperationResponse {
  return !isEvmTransactionResponse(tx)
}

export function isEvmTransactionReceipt(
  receipt: ReducedTransactionReceipt | UserOperationReceipt
): receipt is ReducedTransactionReceipt {
  return !(receipt as UserOperationReceipt).userOpHash
}

export function isEvmUserOperationReceipt(
  receipt: ReducedTransactionReceipt | UserOperationReceipt
): receipt is UserOperationReceipt {
  return !isEvmTransactionReceipt(receipt)
}

function getEvmTransactionInfoFromResponse(
  transaction: IPendingTx | ITransaction
): {
  hash: string
  from: string
  to?: string
  value?: string
  data?: string
  nonce: number
  success?: boolean
  timestamp?: number
} {
  const info = transaction.info as EvmPendingTxInfo | EvmTransactionInfo
  const tx = info.tx
  const receipt = (info as EvmTransactionInfo).receipt
  const req = info.request

  if (isEvmTransactionResponse(tx)) {
    assert(!receipt || isEvmTransactionReceipt(receipt))

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data,
      nonce: tx.nonce,
      success: receipt ? receipt.status === 1 : undefined,
      timestamp: tx.timestamp
    }
  } else {
    assert(!receipt || isEvmUserOperationReceipt(receipt))

    return {
      hash: tx.hash,
      from: tx.sender,
      to: req?.to || tx.decodedCallData?.at(0)?.to,
      value: req?.value?.toString() || tx.decodedCallData?.at(0)?.value,
      data: hexlify(req?.data || []) || tx.decodedCallData?.at(0)?.data,
      nonce: Number(tx.nonce),
      success: receipt
        ? receipt.success && receipt.receipt.status === 1
        : undefined,
      timestamp: tx.timestamp || receipt?.timestamp
    }
  }
}

export function getEvmTransactionInfo(
  transaction: IPendingTx | ITransaction
): TransactionInfo {
  const info = transaction.info as EvmPendingTxInfo | EvmTransactionInfo
  const isPending = isEvmPendingTxInfo(info)
  const txInfo = getEvmTransactionInfoFromResponse(transaction)

  let type, name
  if ((info.tx as any).creates || !txInfo.to) {
    type = TransactionType.DeployContract
    name = 'Deploy Contract'
  } else if (getAddress(txInfo.from) !== transaction.address) {
    type = TransactionType.Receive
    name = 'Receive'
  } else if (!txInfo.data || txInfo.data.toLowerCase() === '0x') {
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
    txInfo.success === false ||
    info.etherscanTx?.txreceipt_status === '0'
  ) {
    status = TransactionStatus.CONFIRMED_FAILURE
  } else {
    status = TransactionStatus.CONFIRMED
  }

  let timestamp
  if (txInfo.timestamp !== undefined) {
    timestamp = txInfo.timestamp * 1000
  }

  const isCancelled =
    txInfo.from === txInfo.to &&
    txInfo.data?.toLowerCase() === '0x' &&
    txInfo.value
      ? BigNumber.from(txInfo.value).isZero()
      : false

  return {
    type,
    isPending,
    isCancelled,
    name,
    from: txInfo.from,
    to: txInfo.to,
    origin: info.origin,
    amount: txInfo.value,
    hash: txInfo.hash,
    nonce: txInfo.nonce,
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
    if (info.tx && isEvmTransactionResponse(info.tx)) {
      const tx = formatter.transactionResponse(info.tx)
      info.tx = {
        ...tx,
        timestamp: info.tx.timestamp
      }
    }
    if (info.receipt && isEvmTransactionReceipt(info.receipt)) {
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

// @ts-ignore
export class EvmTransactionServicePartial
  extends BaseTransactionService
  implements ITransactionService {}

export class EvmBasicTransactionService extends EvmTransactionServicePartial {
  protected normalizeTx<T extends ITransaction | IPendingTx>(
    transaction: T,
    tx: TransactionResponse | UserOperationResponse
  ) {
    if (isEvmTransactionResponse(tx)) {
      delete (tx as any).wait
      delete (tx as any).raw
      delete (tx as any).confirmations
    } else {
      delete (tx as any).wait
      const decoded = tx.decodedCallData
      tx = shallowStringify(tx)
      tx.decodedCallData = decoded
    }
    transaction.info.tx = tx
    return transaction
  }

  protected normalizeTxAndReceipt(
    transaction: ITransaction,
    tx: TransactionResponse | UserOperationResponse,
    receipt?: TransactionReceipt | UserOperationReceipt
  ) {
    transaction = this.normalizeTx(transaction, tx)

    if (receipt) {
      if (isEvmTransactionReceipt(receipt)) {
        delete (receipt as any).confirmations
      } else {
        receipt = shallowStringify(receipt)
      }
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
    tx: TransactionResponse | UserOperationResponse
    request?: TransactionRequest
    origin?: string
    functionSig?: FunctionFragment
  }) {
    assert(
      account.address ===
        getAddress(
          (tx as TransactionResponse).from ||
            (tx as UserOperationResponse).sender
        )
    )

    let transaction = {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      nonce: Number(tx.nonce),
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
    jiffyscanUserOp,
    receipt,
    request,
    origin
  }: {
    account: IChainAccount
    type: string
    tx: TransactionResponse | UserOperationResponse
    etherscanTx?: EtherscanTxResponse
    jiffyscanUserOp?: UserOp
    receipt?: TransactionReceipt | UserOperationReceipt
    request?: TransactionRequest
    origin?: string
  }) {
    assert(etherscanTx || jiffyscanUserOp || receipt)

    let index1, index2
    if (receipt) {
      index1 = isEvmTransactionReceipt(receipt)
        ? receipt.blockNumber
        : Number(receipt.receipt.blockNumber)
      index2 = isEvmTransactionReceipt(receipt)
        ? receipt.transactionIndex
        : Number(receipt.receipt.transactionIndex)
    } else if (etherscanTx) {
      index1 = etherscanTx.blockNumber
      index2 = etherscanTx.transactionIndex
    } else {
      index1 = Number(jiffyscanUserOp!.blockNumber || 0)
      index2 = jiffyscanUserOp!.userOpHash
    }

    let transaction = {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      type,
      index1: index1,
      index2: index2,
      info: {
        etherscanTx,
        jiffyscanUserOp,
        request,
        origin
      } as EvmTransactionInfo
    } as ITransaction

    transaction = this.normalizeTxAndReceipt(transaction, tx, receipt)

    return transaction
  }

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
    const txResponse = await provider.sendTransaction(
      account,
      signedTx,
      request
    )
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
    tx: TransactionResponse | UserOperationResponse,
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
            nonce: Number(tx.nonce)
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
    tx?: TransactionResponse | UserOperationResponse,
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

    const account = await WALLET_SERVICE.getChainAccount({
      masterId: pendingTx.masterId,
      index: pendingTx.index,
      networkKind: pendingTx.networkKind,
      chainId: pendingTx.chainId
    })
    if (!account) {
      await DB.pendingTxs.delete(pendingTx.id)
      return
    }

    const provider = !(await isErc4337Account(account))
      ? await EvmClient.from(network)
      : await EvmErc4337Client.fromMayUndefined(network)
    if (!provider) {
      await DB.pendingTxs.delete(pendingTx.id)
      return
    }

    const info = pendingTx.info as EvmPendingTxInfo
    if (!tx) {
      tx = info.tx as TransactionResponse | UserOperationResponse
    }

    if ((tx as any).wait) {
      // If `wait` exists, transaction is from the immediate `sendTransaction` call.
      // So we persist the start block number for later `waitForTransaction`
      info.startBlockNumber = await provider._getInternalBlockNumber(
        500 + 2 * provider.pollingInterval
      )
      await DB.pendingTxs.update(pendingTx.id, { info })
    }

    let receipt: TransactionReceipt | UserOperationReceipt | undefined
    try {
      if ((tx as any).wait) {
        receipt = await (tx as any).wait(confirmations)
      } else if (typeof info.startBlockNumber === 'number') {
        const replacement = isEvmTransactionResponse(tx)
          ? {
              data: tx.data,
              from: tx.from,
              nonce: tx.nonce,
              to: tx.to,
              value: tx.value,
              startBlock: info.startBlockNumber
            }
          : undefined
        receipt = await provider.waitForTransaction(
          tx.hash,
          confirmations,
          1000 * 60 * 5, // timeout 5m
          replacement as any,
          account
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

        const nonce = await provider.getTransactionCount(
          isEvmTransactionResponse(tx) ? tx.from : tx.sender
        )
        const isMined = nonce > tx.nonce

        console.log(
          `pending tx ${pendingTx.id} will later be waited from block ${
            info.startBlockNumber
          }. ${isMined ? "It was mined but hasn't been found." : ''}`
        )

        return // wait later
      } else if (err.toString().includes('Missing/invalid userOpHash')) {
        const nonce = await provider.getTransactionCount(account)
        const isMined = nonce > Number(tx.nonce)

        if (!isMined) {
          console.log(`pending tx ${pendingTx.id} will later be waited`)

          return // wait later
        }
      } else {
        throw err
      }
    }

    let index1, index2
    if (receipt) {
      const hash = isEvmTransactionReceipt(receipt)
        ? receipt.transactionHash
        : receipt.userOpHash
      const transactionHash = isEvmTransactionReceipt(receipt)
        ? receipt.transactionHash
        : receipt.receipt.transactionHash
      const blockNumber = isEvmTransactionReceipt(receipt)
        ? receipt.blockNumber
        : BigNumber.from(receipt.receipt.blockNumber).toNumber()

      index1 = blockNumber
      index2 = isEvmTransactionReceipt(receipt)
        ? receipt.transactionIndex
        : receipt.userOpHash

      if (
        // tx replacement occurred
        hash !== tx.hash ||
        transactionHash !==
          (isEvmTransactionResponse(tx) ? tx.hash : tx.transactionHash) ||
        // tx mined
        blockNumber !==
          (isEvmTransactionResponse(tx)
            ? tx.blockNumber
            : BigNumber.from(tx.blockNumber || 0).toNumber())
      ) {
        tx = await provider.getTransaction(hash, account)
      }
    } else {
      // for userOp
      assert(isEvmUserOperationResponse(tx))
      if (tx.blockNumber) {
        index1 = BigNumber.from(tx.blockNumber).toNumber()
      } else {
        const [userOp] = (await JIFFYSCAN_API.getUserOp(network, tx.hash)) || []
        if (!userOp) {
          console.log('delete pending tx:', pendingTx.id)
          await DB.pendingTxs.delete(pendingTx.id)
          return
        }
        index1 = BigNumber.from(userOp.blockNumber).toNumber()
      }
      index2 = tx.hash
    }

    // TODO
    const type = isEvmTransactionResponse(tx)
      ? EvmTxType.NORMAL
      : EvmTxType.UserOp

    let transaction = await DB.transactions
      .where({
        masterId: pendingTx.masterId,
        index: pendingTx.index,
        networkKind: pendingTx.networkKind,
        chainId: pendingTx.chainId,
        address: pendingTx.address,
        type,
        index1,
        index2
      })
      .first()

    if (!transaction) {
      transaction = this.newTransaction({
        account,
        type,
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
        // add tx
        transaction.id = await DB.transactions.add(transaction)
      } else {
        // update tx
        await DB.transactions.update(transaction.id, { info: transaction.info })
      }

      await DB.pendingTxs.delete(pendingTx.id)
    })

    await this.notifyTransaction(network, transaction)

    return transaction
  }

  protected async _findCursorForFetchTransactions(
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
      lastIndex1 = lastTx.index1 as number
      lastIndex2 = lastTx.index2 as number
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
      ? Number((lastCursorTx.info as EvmTransactionInfo).tx.blockNumber!) + 1
      : 0

    const transactions = await etherscanProvider.getTransactions(
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
}
