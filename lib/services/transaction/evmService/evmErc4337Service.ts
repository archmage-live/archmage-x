import { FunctionFragment } from '@ethersproject/abi'
import { getAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import { hexlify } from '@ethersproject/bytes'
import { Logger } from '@ethersproject/logger'
import { shallowCopy } from '@ethersproject/properties'
import { TransactionRequest } from '@ethersproject/providers'
import assert from 'assert'
import PQueue from 'p-queue'
import stableHash from 'stable-hash'

import { DB } from '~lib/db'
import { Erc4337CallDataDecoder } from '~lib/erc4337/callData'
import { NetworkKind } from '~lib/network'
import { IChainAccount, IPendingTx, ITransaction } from '~lib/schema'
import { getEvmSignatureFrom4Bytes } from '~lib/services/datasource/4byte'
import { JIFFYSCAN_API, UserOp } from '~lib/services/datasource/jiffyscan'
import { NETWORK_SERVICE } from '~lib/services/network'
import {
  EvmErc4337Client,
  UserOperationReceipt,
  UserOperationResponse
} from '~lib/services/provider/evm'
import {
  TransactionInfo,
  TransactionStatus,
  TransactionType
} from '~lib/services/transaction'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { stringifyBigNumberish } from '~lib/utils'

import { EvmTransactionServicePartial, EvmTxType } from './evmService'

export interface EvmErc4337PendingTxInfo {
  tx: UserOperationResponse

  request: TransactionRequest
  origin?: string
  functionSig?: FunctionFragment
  startBlockNumber?: number
}

export interface EvmErc4337TransactionInfo {
  tx: UserOperationResponse

  receipt?: UserOperationReceipt // only exists for confirmed transaction, but may absent for externally fetched transactions

  jiffyscanUserOp?: UserOp // only exists for Jiffyscan available UserOp

  request?: TransactionRequest // only exists for local sent transaction
  origin?: string // only exists for local sent transaction
  functionSig?: FunctionFragment

  fetchedCursor?: boolean // indication of last externally fetched tx
}

function _isPendingTxInfo(
  info: EvmErc4337PendingTxInfo | EvmErc4337TransactionInfo
): info is EvmErc4337PendingTxInfo {
  const txInfo = info as EvmErc4337TransactionInfo
  return !txInfo.receipt && !txInfo.jiffyscanUserOp
}

function _getInfoFromResponse(transaction: IPendingTx | ITransaction): {
  hash: string
  from: string
  to?: string
  value?: string
  data?: string
  nonce: number
  success?: boolean
  timestamp?: number
} {
  const info = transaction.info as
    | EvmErc4337PendingTxInfo
    | EvmErc4337TransactionInfo
  const tx = info.tx
  const receipt = (info as EvmErc4337TransactionInfo).receipt
  const req = info.request

  return {
    hash: tx.hash,
    from: tx.sender,
    to: req?.to || tx.decodedCallData?.at(0)?.to,
    value: req?.value?.toString() || tx.decodedCallData?.at(0)?.value,
    data: req?.data ? hexlify(req.data) : tx.decodedCallData?.at(0)?.data,
    nonce: Number(tx.nonce),
    success: receipt
      ? receipt.success && receipt.receipt.status !== 0
      : undefined,
    timestamp: tx.timestamp || receipt?.timestamp
  }
}

export function getEvmErc4337TransactionInfo(
  transaction: IPendingTx | ITransaction
): TransactionInfo {
  const info = transaction.info as
    | EvmErc4337PendingTxInfo
    | EvmErc4337TransactionInfo
  const isPending = _isPendingTxInfo(info)
  const txInfo = _getInfoFromResponse(transaction)

  let type, name
  if (!txInfo.to) {
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
    if (info.functionSig) {
      name = info.functionSig.name
    }
    if (name) {
      name = name[0].toUpperCase() + name.slice(1)
    } else {
      name = 'Contract Interaction'
    }
  }

  let status
  if (isPending) {
    status = TransactionStatus.PENDING
  } else if (
    txInfo.success === false ||
    info.jiffyscanUserOp?.success === false
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

export class EvmErc4337TransactionService extends EvmTransactionServicePartial {
  protected normalizeTx<T extends ITransaction | IPendingTx>(
    transaction: T,
    tx: UserOperationResponse
  ) {
    delete (tx as any).wait
    tx = stringifyBigNumberish(tx)
    transaction.info.tx = tx
    return transaction
  }

  protected normalizeTxAndReceipt(
    transaction: ITransaction,
    tx: UserOperationResponse,
    receipt?: UserOperationReceipt
  ) {
    transaction = this.normalizeTx(transaction, tx)
    if (receipt) {
      receipt = stringifyBigNumberish(receipt)
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
    tx: UserOperationResponse
    request: TransactionRequest
    origin?: string
    functionSig?: FunctionFragment
  }) {
    assert(account.address === getAddress(tx.sender))

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
      } as EvmErc4337PendingTxInfo
    } as IPendingTx

    transaction = this.normalizeTx(transaction, tx)

    return transaction
  }

  protected newTransaction({
    account,
    type,
    tx,
    jiffyscanUserOp,
    receipt,
    request,
    origin,
    functionSig
  }: {
    account: IChainAccount
    type: string
    tx: UserOperationResponse
    jiffyscanUserOp?: UserOp
    receipt?: UserOperationReceipt
    request?: TransactionRequest
    origin?: string
    functionSig?: FunctionFragment
  }) {
    assert(jiffyscanUserOp || receipt)

    let index1, index2
    if (receipt) {
      index1 = Number(receipt.receipt.blockNumber)
      index2 = receipt.userOpHash
    } else if (jiffyscanUserOp) {
      index1 = Number(jiffyscanUserOp.blockNumber || 0)
      index2 = jiffyscanUserOp.userOpHash
    }

    let transaction = {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      type,
      index1,
      index2,
      info: {
        jiffyscanUserOp,
        request,
        origin,
        functionSig
      } as EvmErc4337TransactionInfo
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
    // TODO: implement replacement tx for erc4337
    throw new Error('not implemented')
  }

  async addPendingTx(
    account: IChainAccount,
    request: TransactionRequest,
    tx: UserOperationResponse,
    origin?: string,
    functionSig?: FunctionFragment,
    replace = true
  ): Promise<IPendingTx> {
    assert(account.address)

    const wallet = await WALLET_SERVICE.getWallet(account.masterId)
    const subWallet = await WALLET_SERVICE.getSubWallet({
      masterId: account.masterId,
      index: account.index
    })
    assert(wallet && subWallet)

    const accountType =
      wallet.info.erc4337?.type || subWallet.info.erc4337?.type
    assert(accountType)

    if (tx.callData) {
      const decoder = new Erc4337CallDataDecoder(accountType, account.address)
      const decoded = decoder.decodeExecute(tx.callData)

      if (decoded) {
        tx.decodedCallData = [decoded]

        if (decoded.data && !functionSig) {
          functionSig = await getEvmSignatureFrom4Bytes(decoded.data)
        }
      }
    }

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
    tx?: UserOperationResponse,
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

    const provider = await EvmErc4337Client.fromMayUndefined(network)
    if (!provider) {
      await DB.pendingTxs.delete(pendingTx.id)
      return
    }

    const info = pendingTx.info as EvmErc4337PendingTxInfo
    if (!tx) {
      tx = info.tx as UserOperationResponse
    }

    if (tx.wait) {
      // If `wait` exists, transaction is from the immediate `sendTransaction` call.
      // So we persist the start block number for later `waitForTransaction`
      info.startBlockNumber = await provider._getInternalBlockNumber(
        500 + 2 * provider.pollingInterval
      )
      await DB.pendingTxs.update(pendingTx.id, { info })
    }

    let receipt: UserOperationReceipt | undefined
    try {
      if (tx.wait) {
        receipt = await tx.wait(confirmations)
      } else if (typeof info.startBlockNumber === 'number') {
        receipt = await provider.waitForTransaction(
          tx.hash,
          confirmations,
          1000 * 60 * 5, // timeout 5m
          undefined,
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

        const nonce = await provider.getTransactionCount(tx.sender)
        const isMined = nonce > Number(tx.nonce)

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
      const hash = receipt.userOpHash
      const transactionHash = receipt.receipt.transactionHash
      const blockNumber = BigNumber.from(receipt.receipt.blockNumber).toNumber()

      index1 = blockNumber
      index2 = receipt.userOpHash

      if (
        // tx replacement occurred
        hash !== tx.hash ||
        transactionHash !== tx.transactionHash ||
        // tx mined
        blockNumber !== BigNumber.from(tx.blockNumber || 0).toNumber()
      ) {
        tx = await provider.getTransaction(hash, account)
      }
    } else {
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

    const type = EvmTxType.UserOp

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

    const txInfo = transaction.info as EvmErc4337TransactionInfo
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
        (tx) => (tx.info as EvmErc4337TransactionInfo).fetchedCursor
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

  async fetchTransactions(
    account: IChainAccount,
    type: string
  ): Promise<number | undefined> {
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

    assert(type === EvmTxType.UserOp)

    const lastCursorTx = await this._findCursorForFetchTransactions(
      account,
      type
    )
    const lastBlock = lastCursorTx
      ? BigNumber.from(
          (lastCursorTx.info as EvmErc4337TransactionInfo).tx.blockNumber!
        ).toNumber()
      : 0

    const bulkAdd: ITransaction[] = []
    const bulkUpdate: ITransaction[] = []
    const confirmedPending: [IPendingTx, UserOperationResponse][] = []

    let page = -1
    const limit = 100
    while (true) {
      page += 1

      const activity = await JIFFYSCAN_API.getAddressActivity(
        network,
        account.address,
        page * limit,
        limit
      )
      if (!activity) {
        return
      }

      const userOps = activity.accountDetail.userOps
      if (!userOps.length) {
        // no more userOps
        break
      }

      const [latestUserOperation, latestUserOp] =
        (await JIFFYSCAN_API.getUserOp(network, userOps[0].userOpHash)) || []

      if (
        !latestUserOperation ||
        !latestUserOp ||
        BigNumber.from(latestUserOperation.blockNumber || 0).toNumber() <=
          lastBlock
      ) {
        // no new userOps
        break
      }

      // TODO: since jiffyscan doesn't support batch query of UserOperationResponse, we have to query one by one
      const queue = new PQueue({ concurrency: 3 })
      const transactions = (
        await queue.addAll(
          userOps.map(
            (userOp, index) => async () =>
              index === 0
                ? [latestUserOperation, latestUserOp] // fetched above
                : await JIFFYSCAN_API.getUserOp(network, userOp.userOpHash)
          )
        )
      ).filter(Boolean) as [UserOperationResponse, UserOp][]

      const txQuery = []
      for (const [tx] of transactions) {
        txQuery.push([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          type,
          BigNumber.from(tx.blockNumber).toNumber(), // use blockNumber as index1
          tx.hash // use userOpHash as index2
        ])
      }

      const existingTxs = await DB.transactions
        .where(
          '[masterId+index+networkKind+chainId+address+type+index1+index2]'
        )
        .anyOf(txQuery)
        .toArray()
      const existingTxsMap = new Map(
        existingTxs.map((tx) => [tx.index2 as string, tx])
      ) // userOpHash -> tx

      const pendingTxs = await this.getPendingTxs(account)
      const existingPendingTxsMap = new Map(
        pendingTxs.map((pendingTx) => [pendingTx.nonce, pendingTx])
      )

      for (const [tx, jiffyscanUserOp] of transactions) {
        let pendingTxInfo: EvmErc4337PendingTxInfo | undefined
        if (getAddress(tx.sender) === account.address) {
          const pendingTx = existingPendingTxsMap.get(Number(tx.nonce))
          if (pendingTx) {
            pendingTxInfo = pendingTx.info
            confirmedPending.push([pendingTx, tx])
          }
        }

        const existing = existingTxsMap.get(tx.hash)
        if (!existing) {
          const decoded = tx.decodedCallData?.at(0)
          let functionSig
          if (decoded?.data) {
            functionSig = await getEvmSignatureFrom4Bytes(decoded.data)
          }

          bulkAdd.push(
            this.newTransaction({
              account,
              type,
              tx,
              jiffyscanUserOp,
              request: pendingTxInfo?.request,
              origin: pendingTxInfo?.origin,
              functionSig
            })
          )
        } else {
          const info = existing.info as EvmErc4337TransactionInfo
          if (
            info.tx.blockNumber == null ||
            !info.jiffyscanUserOp ||
            info.jiffyscanUserOp.success !== jiffyscanUserOp.success ||
            stableHash(info.tx.decodedCallData) !==
              stableHash(tx.decodedCallData)
          ) {
            info.tx = tx
            info.jiffyscanUserOp = jiffyscanUserOp

            const decoded = tx.decodedCallData?.at(0)
            if (!info.functionSig && decoded?.data) {
              info.functionSig = await getEvmSignatureFrom4Bytes(decoded.data)
            }

            bulkUpdate.push(existing)
          }
        }
      }
    }

    if (!bulkAdd.length && !bulkUpdate.length) {
      return
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
        const index1 = bulkAdd.length ? bulkAdd[0].index1 : bulkUpdate[0].index1
        const index2 = bulkAdd.length ? bulkAdd[0].index2 : bulkUpdate[0].index2
        const cursorTx = await DB.transactions
          .where({
            masterId: account.masterId,
            index: account.index,
            networkKind: account.networkKind,
            chainId: account.chainId,
            address: account.address,
            type,
            index1,
            index2
          })
          .first()
        assert(cursorTx)

        const info = cursorTx.info as EvmErc4337TransactionInfo
        info.fetchedCursor = true
        await DB.transactions.update(cursorTx.id, { info })
      }

      // delete old cursor
      if (lastCursorTx) {
        const info = lastCursorTx.info as EvmErc4337TransactionInfo
        delete info.fetchedCursor
        await DB.transactions.update(lastCursorTx.id, { info })
      }
    })

    for (const [pendingTx, tx] of confirmedPending) {
      await this.checkPendingTx(pendingTx, tx)
    }

    return bulkAdd.length + bulkUpdate.length
  }
}
