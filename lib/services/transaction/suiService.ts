import {
  MoveCallSuiTransaction,
  SuiArgument,
  SuiTransactionBlockResponse
} from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { normalizeSuiAddress } from '@mysten/sui.js/utils'
import assert from 'assert'
import Decimal from 'decimal.js'

import { DB } from '~lib/db'
import { isBackgroundWorker } from '~lib/detect'
import { NetworkKind } from '~lib/network'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IChainAccount, IPendingTx, ITransaction } from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import { getSuiClient } from '~lib/services/provider/sui/client'
import { normalizeSuiType } from '~lib/wallet'

import {
  ITransactionService,
  TransactionInfo,
  TransactionStatus,
  TransactionType,
  isPendingTx
} from '.'
import { BaseTransactionService } from './baseService'

export interface SuiPendingTxInfo {
  txResponse: SuiTransactionBlockResponse

  tx: string // serialized TransactionBlock

  origin?: string // only exists for local sent transaction
}

export interface SuiTransactionInfo {
  txResponse: SuiTransactionBlockResponse

  tx?: string // serialized TransactionBlock; only exists for local sent transaction

  origin?: string // only exists for local sent transaction
}

export function getSuiTransactionInfo(
  transaction: IPendingTx | ITransaction
): TransactionInfo {
  const info = transaction.info as SuiPendingTxInfo | SuiTransactionInfo
  const txResponse = info.txResponse

  const data = txResponse.transaction?.data
  const from = data?.sender ? normalizeSuiAddress(data.sender) : undefined
  const txBlockKind = data?.transaction

  const balanceChange = txResponse.balanceChanges?.find((change) => {
    const owner = change.owner as {
      AddressOwner: string
    }
    return (
      normalizeSuiType(change.coinType) === normalizeSuiType('0x2::sui::SUI') &&
      normalizeSuiAddress(owner.AddressOwner) === transaction.address
    )
  })
  const amount = balanceChange?.amount
    ? new Decimal(balanceChange.amount)
    : undefined

  const timestamp =
    typeof txResponse.timestampMs === 'string'
      ? Number(txResponse.timestampMs)
      : undefined

  let type, name
  if (txBlockKind?.kind === 'ProgrammableTransaction') {
    const txs = txBlockKind.transactions

    const txsNotSplitMergeCoins = txs.filter((tx) => {
      const stx = tx as SuiTx
      return !stx.SplitCoins && !stx.MergeCoins
    })

    const kind = (object: Object) => Object.keys(object)[0] as keyof SuiTx

    if (txs.length === 1) {
      name = kind(txs[0])
    } else {
      if (txsNotSplitMergeCoins.length) {
        const firstKind = kind(txsNotSplitMergeCoins[0])
        name =
          txsNotSplitMergeCoins.length === 1 ? firstKind : `${firstKind}...`
      } else {
        name = `${kind(txs[0])}...`
      }
    }

    if (name === 'TransferObjects') {
      type = amount?.isPositive()
        ? TransactionType.Receive
        : TransactionType.Send
    } else if (name === 'Publish' || name === 'Upgrade') {
      type = TransactionType.DeployContract
    } else {
      type = TransactionType.CallContract
    }

    if (txsNotSplitMergeCoins.length === 1) {
      const tx = txsNotSplitMergeCoins[0] as SuiTx
      if (tx.TransferObjects) {
        // TODO
      }
    }
  }

  return {
    type,
    isPending: isPendingTx(transaction),
    isCancelled: false,
    name,
    from,
    to: undefined,
    origin: info.origin,
    amount: amount?.abs().toString(),
    hash: txResponse.digest,
    nonce:
      timestamp !== undefined
        ? timestamp
        : isPendingTx(transaction)
        ? transaction.nonce
        : 0, // should not be 0
    status: isPendingTx(transaction)
      ? TransactionStatus.PENDING
      : txResponse.effects?.status.status !== 'failure'
      ? TransactionStatus.CONFIRMED
      : TransactionStatus.CONFIRMED_FAILURE,
    timestamp
  } as TransactionInfo
}

type SuiTx = Partial<
  SuiMoveCall &
    SuiTransferObjects &
    SuiSplitCoins &
    SuiMergeCoins &
    SuiPublish &
    SuiUpgrade &
    SuiMakeMoveVec
>
type SuiMoveCall = {
  MoveCall: MoveCallSuiTransaction
}
type SuiTransferObjects = {
  TransferObjects: [SuiArgument[], SuiArgument]
}
type SuiSplitCoins = {
  SplitCoins: [SuiArgument, SuiArgument[]]
}
type SuiMergeCoins = {
  MergeCoins: [SuiArgument, SuiArgument[]]
}
type SuiPublish = {
  Publish: string[]
}
type SuiUpgrade = {
  Upgrade: [string[], string, SuiArgument]
}
type SuiMakeMoveVec = {
  MakeMoveVec: [string | null, SuiArgument[]]
}

// @ts-ignore
class SuiTransactionServicePartial
  extends BaseTransactionService
  implements ITransactionService {}

export class SuiTransactionService extends SuiTransactionServicePartial {
  async addPendingTx(
    account: IChainAccount,
    tx: TransactionBlock,
    txResponse: SuiTransactionBlockResponse,
    origin?: string
  ): Promise<IPendingTx> {
    assert(account.address)

    const pendingTx = {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      // here we use timestamp as nonce, since Sui doesn't use nonce
      nonce: txResponse.timestampMs
        ? Number(txResponse.timestampMs)
        : Date.now(),
      hash: txResponse.digest,
      info: {
        tx: tx.serialize(),
        txResponse,
        origin
      } as SuiPendingTxInfo
    } as IPendingTx

    pendingTx.id = await DB.pendingTxs.add(pendingTx)

    this.checkPendingTx(pendingTx).finally()

    return pendingTx
  }

  async waitForTx(
    pendingTx: IPendingTx,
    ...args: any[]
  ): Promise<ITransaction | undefined> {
    if (!(await this.getPendingTx(pendingTx.id))) {
      return
    }

    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.SUI,
      chainId: pendingTx.chainId
    })
    if (!network) {
      await DB.pendingTxs.delete(pendingTx.id)
      return
    }

    const info = pendingTx.info as SuiPendingTxInfo

    const client = await getSuiClient(network)

    const txResponse = await client.waitForTransactionBlock({
      digest: info.txResponse.digest,
      options: {
        showBalanceChanges: true,
        showEffects: true,
        showEvents: true,
        showInput: true,
        showObjectChanges: true
      }
    })

    if (!txResponse.checkpoint) {
      throw new Error(
        `Transaction with digest ${txResponse.digest} was submitted but was not yet found on the chain. You might want to check later.`
      )
    }

    let transaction = {
      masterId: pendingTx.masterId,
      index: pendingTx.index,
      networkKind: pendingTx.networkKind,
      chainId: pendingTx.chainId,
      address: pendingTx.address,
      type: '',
      index1: Number(txResponse.checkpoint),
      index2: txResponse.digest,
      info: {
        txResponse,
        tx: info.tx,
        origin: info.origin
      } as SuiTransactionInfo
    } as ITransaction

    await DB.transaction('rw', [DB.pendingTxs, DB.transactions], async () => {
      const existingTx = await DB.transactions
        .where({
          masterId: pendingTx.masterId,
          index: pendingTx.index,
          networkKind: pendingTx.networkKind,
          chainId: pendingTx.chainId,
          address: pendingTx.address,
          type: '',
          index1: Number(txResponse.checkpoint),
          index2: txResponse.digest
        })
        .first()
      if (!existingTx) {
        transaction.id = await DB.transactions.add(transaction)
      } else {
        transaction = existingTx
      }

      if (!(await this.getPendingTx(pendingTx.id))) {
        return
      }
      await DB.pendingTxs.delete(pendingTx.id)
    })

    await this.notifyTransaction(network, transaction)

    return transaction
  }

  async fetchTransactions(
    account: IChainAccount,
    type: string
  ): Promise<number | undefined> {
    assert(type === '')
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

    const client = await getSuiClient(network)

    const lastTx = await DB.transactions
      .where('[masterId+index+networkKind+chainId+address+type]')
      .equals([
        account.masterId,
        account.index,
        account.networkKind,
        account.chainId,
        account.address!,
        type
      ])
      .last()
    const lastCheckpoint = lastTx?.index1 as number | undefined

    let cursor: string | undefined
    while (true) {
      const { data, hasNextPage, nextCursor } =
        await client.queryTransactionBlocks({
          cursor,
          limit: 100,
          order: 'descending',
          filter: {
            // filter by from/to address
            FromOrToAddress: {
              addr: account.address
            }
          },
          options: {
            showBalanceChanges: true,
            showEffects: true,
            showEvents: true,
            showInput: true,
            showObjectChanges: true
          }
        })

      if (!data.length) {
        break
      }

      let done = false
      if (!hasNextPage || !nextCursor) {
        done = true
      }
      cursor = nextCursor || undefined

      const txResponses = []
      const txQuery = []
      for (const txResponse of data) {
        if (typeof txResponse.checkpoint !== 'string') {
          // we always filter out the transaction if it is not included into a checkpoint
          continue
        }
        const checkpoint = Number(txResponse.checkpoint)

        if (lastCheckpoint !== undefined && checkpoint <= lastCheckpoint) {
          done = true
        }

        txResponses.push(txResponse)

        txQuery.push([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          type,
          checkpoint,
          txResponse.digest
        ])
      }

      const existingTxs = await DB.transactions
        .where(
          '[masterId+index+networkKind+chainId+address+type+index1+index2]'
        )
        .anyOf(txQuery)
        .toArray()
      const existingTxsSet = new Set(existingTxs.map((tx) => tx.index2))

      const addTxs: ITransaction[] = []
      const pendingTxsForTxsQuery = []
      for (const txResponse of txResponses) {
        if (existingTxsSet.has(txResponse.digest)) {
          continue
        }

        addTxs.push({
          masterId: account.masterId,
          index: account.index,
          networkKind: account.networkKind,
          chainId: account.chainId,
          address: account.address!,
          type,
          index1: Number(txResponse.checkpoint),
          index2: txResponse.digest,
          info: {
            txResponse
          } as SuiTransactionInfo
        } as ITransaction)

        pendingTxsForTxsQuery.push([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          txResponse.digest
        ])
      }

      const existingPendingTxsForTxs = await DB.pendingTxs
        .where('[masterId+index+networkKind+chainId+address+hash]')
        .anyOf(pendingTxsForTxsQuery)
        .toArray()
      const existingPendingTxsForTxsMap = new Map(
        existingPendingTxsForTxs.map((tx) => [
          tx.hash,
          tx.info as SuiPendingTxInfo
        ])
      )
      addTxs.forEach((tx) => {
        const info = tx.info as SuiTransactionInfo
        const pendingTxInfo = existingPendingTxsForTxsMap.get(
          info.txResponse.digest
        )
        info.tx = pendingTxInfo?.tx
        info.origin = pendingTxInfo?.origin
      })

      const deletePendingTxs = existingPendingTxsForTxs.map((tx) => tx.id)

      await DB.transaction('rw', [DB.pendingTxs, DB.transactions], async () => {
        if (deletePendingTxs.length) {
          await DB.pendingTxs.bulkDelete(deletePendingTxs)
        }
        if (addTxs.length) {
          await DB.transactions.bulkAdd(addTxs)
        }
      })

      if (done) {
        break
      }
    }
  }
}

function createSuiTransactionService(): ITransactionService {
  const serviceName = 'suiTransactionService'
  let service
  if (isBackgroundWorker()) {
    service = new SuiTransactionService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
  } else {
    service = SERVICE_WORKER_CLIENT.service<ITransactionService>(
      serviceName,
      // @ts-ignore
      new SuiTransactionServicePartial()
    )
  }
  return service
}

export const SUI_TRANSACTION_SERVICE = createSuiTransactionService()
