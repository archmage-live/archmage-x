import { FunctionFragment } from '@ethersproject/abi'
import { getAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import { shallowCopy } from '@ethersproject/properties'
import { SafeMultisigTransactionWithTransfersResponse } from '@safe-global/api-kit'
import {
  SafeMultisigTransactionResponse,
  SafeTransactionData
} from '@safe-global/safe-core-sdk-types'
import assert from 'assert'
import stableHash from 'stable-hash'

import { DB } from '~lib/db'
import { NetworkKind } from '~lib/network'
import {
  SafeTransactionResponse,
  getSafeAccount,
  getSafeService,
  getSafeTxHash
} from '~lib/safe'
import { IChainAccount, IPendingTx, ITransaction } from '~lib/schema'
import { getEvmSignatureFrom4Bytes } from '~lib/services/datasource/4byte'
import { NETWORK_SERVICE } from '~lib/services/network'
import { EvmClient } from '~lib/services/provider/evm'
import {
  TransactionInfo,
  TransactionStatus,
  TransactionType
} from '~lib/services/transaction'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { stall } from '~lib/utils'

import { EvmTransactionServicePartial, EvmTxType } from './evmService'

export interface EvmSafePendingTxInfo {
  tx: SafeMultisigTransactionResponse

  request: SafeTransactionData
  origin?: string
  functionSig?: FunctionFragment
}

export interface EvmSafeTransactionInfo {
  tx: SafeTransactionResponse

  request?: SafeTransactionData // only exists for local sent transaction
  origin?: string // only exists for local sent transaction
  functionSig?: FunctionFragment

  fetchedCursor?: boolean // indication of last externally fetched tx
}

function _isPendingTxInfo(
  info: EvmSafePendingTxInfo | EvmSafeTransactionInfo
): info is EvmSafePendingTxInfo {
  const txInfo = info as EvmSafeTransactionInfo
  return !txInfo.tx.txType
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
  const info = transaction.info as EvmSafePendingTxInfo | EvmSafeTransactionInfo

  let tx = info.tx as SafeTransactionResponse
  if (!tx.txType) {
    tx = {
      ...(tx as SafeMultisigTransactionWithTransfersResponse),
      txType: 'MULTISIG_TRANSACTION',
      transfers: []
    }
  }

  let from, nonce, success
  switch (tx.txType) {
    case 'MULTISIG_TRANSACTION':
      from = transaction.address
      nonce = tx.nonce
      success = tx.isSuccessful
      break
    case 'MODULE_TRANSACTION':
      from = tx.module
      nonce = 0 // TODO
      success = tx.isSuccessful
      break
    case 'ETHEREUM_TRANSACTION':
      from = tx.from
      nonce = 0 // TODO
      success = true
      break
    default:
      throw new Error('unknown safe tx type')
  }

  return {
    hash: getSafeTxHash(tx)!,
    from,
    to: tx.to,
    value: (tx as any).value,
    data: tx.data,
    nonce: nonce,
    success,
    timestamp: Math.floor(Number(new Date(tx.executionDate)) / 1000)
  }
}

export function getEvmSafeTransactionInfo(
  transaction: IPendingTx | ITransaction
): TransactionInfo {
  const info = transaction.info as EvmSafePendingTxInfo | EvmSafeTransactionInfo
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
  } else if (txInfo.success === false) {
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

export class EvmSafeTransactionService extends EvmTransactionServicePartial {
  protected newPendingTx({
    account,
    tx,
    request,
    origin,
    functionSig
  }: {
    account: IChainAccount
    tx: SafeMultisigTransactionResponse
    request?: SafeTransactionData
    origin?: string
    functionSig?: FunctionFragment
  }) {
    assert(account.address === getAddress(tx.safe))

    return {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      nonce: tx.nonce,
      info: {
        tx,
        request,
        origin,
        functionSig
      } as EvmSafePendingTxInfo
    } as IPendingTx
  }

  protected newTransaction({
    account,
    type,
    tx,
    request,
    origin,
    functionSig
  }: {
    account: IChainAccount
    type: string
    tx: SafeTransactionResponse
    request?: SafeTransactionData
    origin?: string
    functionSig?: FunctionFragment
  }) {
    const index1 = tx.blockNumber!
    const index2 = getSafeTxHash(tx)!

    return {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      type,
      index1,
      index2,
      info: {
        tx,
        request,
        origin,
        functionSig
      } as EvmSafeTransactionInfo
    } as ITransaction
  }

  async signAndSendTx(
    account: IChainAccount,
    request: SafeTransactionData,
    origin?: string,
    functionSig?: FunctionFragment,
    replace?: boolean
  ): Promise<IPendingTx> {
    // TODO: implement replacement tx for safe
    throw new Error('not implemented')
  }

  async addPendingTx(
    account: IChainAccount,
    request: SafeTransactionData,
    tx: SafeMultisigTransactionResponse,
    origin?: string,
    functionSig?: FunctionFragment,
    replace = true
  ) {
    assert(account.address)

    if (tx.data && !functionSig) {
      functionSig = await getEvmSignatureFrom4Bytes(tx.data)
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
    tx?: SafeMultisigTransactionResponse,
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
    if (!account?.address) {
      await DB.pendingTxs.delete(pendingTx.id)
      return
    }

    const info = pendingTx.info as EvmSafePendingTxInfo
    if (!tx) {
      tx = info.tx
    }

    const provider = await EvmClient.from(network.chainId)
    const safeService = getSafeService(provider, network.chainId)

    // wait for tx executed
    for (let i = 12; i >= 0; --i) {
      tx = await safeService.getTransaction(tx.safeTxHash)
      if (tx.isExecuted) {
        break
      }
      if (i > 0) {
        await stall(5000)
      }
    }

    if (!tx.isExecuted) {
      const safe = await getSafeAccount(
        provider,
        account.address,
        account.info.safe!.isL1SafeMasterCopy
      )

      const nonce = await safe.getNonce()
      const isMined = nonce > tx.nonce

      console.log(
        `pending tx ${pendingTx.id} will later be waited. ${
          isMined ? "It was mined but hasn't been found." : ''
        }`
      )

      return // wait later
    }

    const type = EvmTxType.NORMAL

    const index1 = tx.blockNumber! // use blockNumber as index1
    const index2 = tx.safeTxHash

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

    const txWithType: SafeMultisigTransactionWithTransfersResponse = {
      ...tx,
      txType: 'MULTISIG_TRANSACTION',
      transfers: []
    }

    if (!transaction) {
      transaction = this.newTransaction({
        account,
        type,
        tx: txWithType,
        request: info.request,
        origin: info.origin,
        functionSig: info.functionSig
      })
    } else {
      const txInfo = transaction.info as EvmSafeTransactionInfo
      txInfo.tx = txWithType
      txInfo.request = info.request
      txInfo.origin = info.origin
      txInfo.functionSig = info.functionSig
    }

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
    let lastIndex2: string | undefined = undefined
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
        (tx) => (tx.info as EvmSafeTransactionInfo).fetchedCursor
      )
      if (cursorTx) {
        return cursorTx
      }
      if (txs.length < limit) {
        break
      }
      const lastTx = txs[txs.length - 1]
      lastIndex1 = lastTx.index1 as number
      lastIndex2 = lastTx.index2 as string
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

    assert(type === EvmTxType.NORMAL)

    const lastCursorTx = await this._findCursorForFetchTransactions(
      account,
      type
    )
    const lastBlock = lastCursorTx
      ? (lastCursorTx.info as EvmSafeTransactionInfo).tx.blockNumber!
      : 0

    const provider = await EvmClient.from(network.chainId)
    const safeService = getSafeService(provider, network.chainId)

    // fetch pending transactions

    {
      const pendingTxs = []

      const limit = 100
      for (let page = 0; ; page += 1) {
        const rep = await safeService.getPendingTransactions(
          account.address,
          undefined,
          {
            limit,
            offset: page * limit
          }
        )

        if (!rep.results.length) {
          break
        }

        pendingTxs.push(...rep.results)

        if (!rep.next) {
          break
        }
      }

      const existingPendingTxs = await this.getPendingTxs(account)
      const existingPendingTxsMap = new Map(
        existingPendingTxs.map((pendingTx) => [pendingTx.hash!, pendingTx])
      )

      const provider = await EvmClient.from(network.chainId)

      const bulkUpdate: IPendingTx[] = []
      for (const pendingTx of pendingTxs) {
        const existing = existingPendingTxsMap.get(pendingTx.safeTxHash)

        const safe = await getSafeAccount(
          provider,
          account.address,
          account.info.safe!.isL1SafeMasterCopy
        )
        const safeTx = await safe.toSafeTransactionType(pendingTx)
        const request = safeTx.data

        if (!existing) {
          await this.addPendingTx(account, request, pendingTx)
        } else {
          const info = existing.info as EvmSafePendingTxInfo
          if (stableHash(pendingTx) !== stableHash(info.tx)) {
            info.tx = pendingTx

            if (!info.functionSig && info.tx.data) {
              info.functionSig = await getEvmSignatureFrom4Bytes(info.tx.data)
            }

            bulkUpdate.push(existing)
          }
        }
      }

      await DB.transaction('rw', [DB.pendingTxs], async () => {
        if (bulkUpdate.length) {
          await DB.pendingTxs.bulkPut(bulkUpdate)
        }
      })
    }

    // fetch executed transactions

    const bulkAdd: ITransaction[] = []
    const bulkUpdate: ITransaction[] = []
    const confirmedPending: [IPendingTx, SafeMultisigTransactionResponse][] = []

    let page = -1
    const limit = 100
    while (true) {
      page += 1

      const rep = await safeService.getAllTransactions(account.address, {
        // only executed and non-queued txs
        executed: true,
        queued: false,
        limit,
        offset: page * limit
      })

      const transactions = rep.results.filter(
        (tx) => typeof tx.blockNumber === 'number'
      )
      if (!transactions.length) {
        break
      }

      if (transactions[0].blockNumber! <= lastBlock) {
        // no new txs
        break
      }

      const txQuery = []
      for (const tx of transactions) {
        const txHash = getSafeTxHash(tx)
        if (!txHash) {
          continue
        }
        txQuery.push([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          type,
          tx.blockNumber!, // use blockNumber as index1
          txHash! // use txHash as index2
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
      ) // txHash -> tx

      const existingPendingTxs = await this.getPendingTxs(account)
      const existingPendingMap = new Map(
        existingPendingTxs.map((pendingTx) => [pendingTx.nonce, pendingTx])
      )

      for (const tx of transactions) {
        const txHash = getSafeTxHash(tx)
        if (!txHash) {
          continue
        }

        let pendingTxInfo: EvmSafePendingTxInfo | undefined
        if (tx.txType === 'MULTISIG_TRANSACTION') {
          const pendingTx = existingPendingMap.get(tx.nonce)
          if (pendingTx) {
            pendingTxInfo = pendingTx.info
            confirmedPending.push([pendingTx, tx])
          }
        }

        const existing = existingTxsMap.get(txHash)
        if (!existing) {
          let functionSig
          if (tx.data) {
            functionSig = await getEvmSignatureFrom4Bytes(tx.data)
          }

          bulkAdd.push(
            this.newTransaction({
              account,
              type,
              tx,
              request: pendingTxInfo?.request,
              origin: pendingTxInfo?.origin,
              functionSig
            })
          )
        } else {
          const info = existing.info as EvmSafeTransactionInfo
          if (stableHash(info.tx) !== stableHash(tx)) {
            info.tx = tx

            if (!info.functionSig && tx.data) {
              info.functionSig = await getEvmSignatureFrom4Bytes(tx.data)
            }

            bulkUpdate.push(existing)
          }
        }
      }

      if (!rep.next) {
        break
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

        const info = cursorTx.info as EvmSafeTransactionInfo
        info.fetchedCursor = true
        await DB.transactions.update(cursorTx.id, { info })
      }

      // delete old cursor
      if (lastCursorTx) {
        const info = lastCursorTx.info as EvmSafeTransactionInfo
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
