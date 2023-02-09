import {
  AptosAccount,
  AptosClient,
  HexString,
  TransactionBuilderRemoteABI,
  Types
} from 'aptos'
import assert from 'assert'
import { useMemo } from 'react'
import { useAsync } from 'react-use'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { NetworkKind } from '~lib/network'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import {
  IAptosEvent,
  IChainAccount,
  INetwork,
  IPendingTx,
  ITransaction
} from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import { getAptosClient } from '~lib/services/provider/aptos/client'
import {
  FakeAptosAccount,
  isAptosEntryFunctionPayload,
  isAptosScriptPayload
} from '~lib/services/provider/aptos/types'
import {
  parseAptosTxCoinEvents,
  parseAptosTxInfo
} from '~lib/services/transaction/aptosParse'

import {
  ITransactionService,
  TransactionInfo,
  TransactionStatus,
  TransactionType
} from '.'
import { BaseTransactionService } from './baseService'

export interface AptosPendingTxInfo {
  tx: Types.Transaction_PendingTransaction
  simulatedTx?: Types.Transaction_UserTransaction

  origin?: string // only exists for local sent transaction
}

export interface AptosTransactionInfo {
  tx: Types.Transaction_UserTransaction

  origin?: string // only exists for local sent transaction
}

export function getAptosTransactionInfo(
  transaction: IPendingTx | ITransaction
): TransactionInfo {
  const info = transaction.info as AptosPendingTxInfo | AptosTransactionInfo
  const tx = info.tx

  const maybeUserTx = isAptosPendingTransaction(tx)
    ? (info as AptosPendingTxInfo).simulatedTx || tx
    : isAptosUserTransaction(tx)
    ? tx
    : undefined

  const { success, type, functionShort, to, amount } = maybeUserTx
    ? parseAptosTxInfo(transaction.address, maybeUserTx)
    : ({} as any)

  let name
  if (type === TransactionType.Send) {
    name = 'Send'
  } else if (type === TransactionType.Receive) {
    name = 'Receive'
  } else {
    name = functionShort
  }

  return {
    type,
    isPending: isAptosPendingTransaction(tx),
    isCancelled: false, // TODO
    name,
    to,
    origin: info.origin,
    amount,
    hash: tx.hash,
    nonce: +tx.sequence_number,
    status: isAptosPendingTransaction(tx)
      ? TransactionStatus.PENDING
      : success
      ? TransactionStatus.CONFIRMED
      : TransactionStatus.CONFIRMED_FAILURE,
    timestamp: isAptosUserTransaction(tx)
      ? Math.floor(+tx.timestamp / 1000)
      : undefined
  } as TransactionInfo
}

// @ts-ignore
class AptosTransactionServicePartial
  extends BaseTransactionService
  implements ITransactionService {}

export class AptosTransactionService extends AptosTransactionServicePartial {
  async signAndSendTx(
    account: IChainAccount,
    tx: Types.Transaction_PendingTransaction,
    simulatedTx: Types.Transaction_UserTransaction,
    origin?: string
  ): Promise<IPendingTx> {
    const network = await NETWORK_SERVICE.getNetwork({
      kind: account.networkKind,
      chainId: account.chainId
    })
    assert(network)

    const client = await getAptosClient(network)
    assert(client)

    // TODO

    return {} as IPendingTx
  }

  async addPendingTx(
    account: IChainAccount,
    tx: Types.Transaction_PendingTransaction,
    simulatedTx: Types.Transaction_UserTransaction,
    origin?: string
  ): Promise<IPendingTx> {
    assert(account.address)

    const pendingTx = {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      nonce: +tx.sequence_number,
      info: {
        tx,
        simulatedTx,
        origin
      } as AptosPendingTxInfo
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
      kind: NetworkKind.APTOS,
      chainId: pendingTx.chainId
    })
    if (!network) {
      await DB.pendingTxs.delete(pendingTx.id)
      return
    }

    const client = await getAptosClient(network)
    if (!client) {
      return
    }

    const info = pendingTx.info as AptosPendingTxInfo

    const tx = (await client.waitForTransactionWithResult(
      info.tx.hash
    )) as Types.Transaction_UserTransaction

    let transaction = {
      masterId: pendingTx.masterId,
      index: pendingTx.index,
      networkKind: pendingTx.networkKind,
      chainId: pendingTx.chainId,
      address: pendingTx.address,
      type: '',
      index1: +tx.version,
      index2: +tx.sequence_number,
      info: {
        tx,
        origin: info.origin
      } as AptosTransactionInfo
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
          index1: +tx.version,
          index2: +tx.sequence_number
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

    const client = await getAptosClient(network)
    if (!client) {
      return
    }

    await fetchTxs(client, account)
  }
}

export function isAptosPendingTransaction(
  tx: Types.Transaction_PendingTransaction | Types.Transaction_UserTransaction
): tx is Types.Transaction_PendingTransaction {
  return tx.type === 'pending_transaction'
}

export function isAptosUserTransaction(
  tx: Types.Transaction_PendingTransaction | Types.Transaction_UserTransaction
): tx is Types.Transaction_UserTransaction {
  return tx.type === 'user_transaction'
}

async function fetchTxs(client: AptosClient, account: IChainAccount) {
  while (true) {
    const lastTx = await DB.transactions
      .where('[masterId+index+networkKind+chainId+address+type]')
      .equals([
        account.masterId,
        account.index,
        account.networkKind,
        account.chainId,
        account.address!,
        ''
      ])
      .last()

    const transactions = (await client.getAccountTransactions(
      account.address!,
      {
        start: lastTx ? (lastTx.index1 as number) + 1 : 0, // `index1` as tx version
        limit: 100
      }
    )) as (
      | Types.Transaction_PendingTransaction
      | Types.Transaction_UserTransaction
    )[]

    if (!transactions.length) {
      break
    }

    const pendingTxQuery = []
    const txQuery = []
    for (const tx of transactions) {
      if (isAptosPendingTransaction(tx)) {
        pendingTxQuery.push([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          +tx.sequence_number
        ])
      }
      if (isAptosUserTransaction(tx)) {
        txQuery.push([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          '',
          +tx.version
        ])
      }
    }

    const existingPendingTxs = await DB.pendingTxs
      .where('[masterId+index+networkKind+chainId+address+nonce]')
      .anyOf(pendingTxQuery)
      .toArray()
    const existingPendingTxsSet = new Set(
      existingPendingTxs.map((tx) => tx.nonce)
    )

    const existingTxs = await DB.transactions
      .where('[masterId+index+networkKind+chainId+address+type+index1]')
      .anyOf(txQuery)
      .toArray()
    const existingTxsSet = new Set(existingTxs.map((tx) => tx.index1))

    const addPendingTxs: IPendingTx[] = []
    const addTxs: ITransaction[] = []

    for (const tx of transactions) {
      if (isAptosPendingTransaction(tx)) {
        if (existingPendingTxsSet.has(+tx.sequence_number)) {
          continue
        }

        let simulatedTx
        const aptosAccount = new FakeAptosAccount(
          HexString.ensure(account.address!) // TODO
        )
        if (isAptosEntryFunctionPayload(tx.payload)) {
          const txBuilder = new TransactionBuilderRemoteABI(client, {
            sender: account.address!,
            sequenceNumber: tx.sequence_number,
            gasUnitPrice: tx.gas_unit_price,
            maxGasAmount: tx.max_gas_amount,
            expSecFromNow:
              Number(tx.expiration_timestamp_secs) -
              Math.floor(Date.now() / 1000),
            chainId: account.chainId
          })
          const rawTx = await txBuilder.build(
            tx.payload.function,
            tx.payload.type_arguments,
            tx.payload.arguments
          )
          const simulatedTxs = await client.simulateTransaction(
            aptosAccount as unknown as AptosAccount,
            rawTx
          )
          simulatedTx = simulatedTxs.length ? simulatedTxs[0] : undefined
        } else if (isAptosScriptPayload(tx.payload)) {
          // TODO
        }

        addPendingTxs.push({
          masterId: account.masterId,
          index: account.index,
          networkKind: account.networkKind,
          chainId: account.chainId,
          address: account.address!,
          nonce: Number(tx.sequence_number),
          info: {
            tx,
            simulatedTx
          } as AptosPendingTxInfo
        } as IPendingTx)
      }

      if (isAptosUserTransaction(tx)) {
        if (existingTxsSet.has(+tx.version)) {
          continue
        }
        addTxs.push({
          masterId: account.masterId,
          index: account.index,
          networkKind: account.networkKind,
          chainId: account.chainId,
          address: account.address!,
          type: '',
          index1: Number(tx.version),
          index2: Number(tx.sequence_number),
          info: {
            tx
          } as AptosTransactionInfo
        } as ITransaction)
      }
    }

    const pendingTxsForTxsQuery = addTxs.map((tx) => [
      account.masterId,
      account.index,
      account.networkKind,
      account.chainId,
      account.address!,
      tx.index2 // `index2` as sequence number / nonce
    ])
    const existingPendingTxsForTxs = await DB.pendingTxs
      .where('[masterId+index+networkKind+chainId+address+nonce]')
      .anyOf(pendingTxsForTxsQuery)
      .toArray()
    const existingPendingTxsForTxsMap = new Map(
      existingPendingTxsForTxs.map((tx) => [
        tx.nonce,
        (tx.info as AptosPendingTxInfo).origin
      ])
    )
    addTxs.forEach(
      (tx) =>
        ((tx.info as AptosTransactionInfo).origin =
          existingPendingTxsForTxsMap.get(tx.index2 as number))
    )
    const deletePendingTxs = existingPendingTxsForTxs.map((tx) => tx.id)

    await DB.transaction('rw', [DB.pendingTxs, DB.transactions], async () => {
      if (addPendingTxs.length) await DB.pendingTxs.bulkAdd(addPendingTxs)
      if (deletePendingTxs.length)
        await DB.pendingTxs.bulkDelete(deletePendingTxs)
      if (addTxs.length) await DB.transactions.bulkAdd(addTxs)
    })
  }

  await fetchEvents(client, account)
}

async function fetchEvents(client: AptosClient, account: IChainAccount) {
  let creationNumber = -1
  while (true) {
    ++creationNumber

    while (true) {
      const lastEvent = await DB.aptosEvents
        .where('[masterId+index+networkKind+chainId+address+creationNumber]')
        .equals([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          creationNumber
        ])
        .last()
      const nextSequenceNumber = lastEvent ? lastEvent.sequenceNumber + 1 : 0

      let events
      events = await client.getEventsByCreationNumber(
        account.address!,
        creationNumber,
        {
          start: nextSequenceNumber,
          limit: 100
        }
      )

      if (!events.length) {
        if (nextSequenceNumber === 0) {
          // monotonically increased creationNumber break off
          return
        }

        break
      }

      const eventQuery = []
      for (const event of events) {
        eventQuery.push([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          creationNumber,
          +event.sequence_number
        ])
      }

      const existingEvents = await DB.aptosEvents
        .where(
          '[masterId+index+networkKind+chainId+address+creationNumber+sequenceNumber]'
        )
        .anyOf(eventQuery)
        .toArray()
      const existingEventsSet = new Set(
        existingEvents.map((event) => event.sequenceNumber)
      )

      // tx versions
      const versions = events.map((event) => Number((event as any).version))
      const uniqueVersions = new Set<number>()
      const txQuery = []
      for (const version of versions) {
        if (uniqueVersions.has(version)) {
          continue
        }
        uniqueVersions.add(version)
        txQuery.push([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          '',
          version
        ])
      }
      const existingTxs = await DB.transactions
        .where('[masterId+index+networkKind+chainId+address+type+index1]')
        .anyOf(txQuery)
        .toArray()
      const existingVersions = new Set(existingTxs.map((tx) => tx.index1))

      const eventsAdd: IAptosEvent[] = []
      const txsAdd: ITransaction[] = []
      uniqueVersions.clear()
      for (const event of events) {
        if (!existingEventsSet.has(+event.sequence_number)) {
          eventsAdd.push({
            masterId: account.masterId,
            index: account.index,
            networkKind: account.networkKind,
            chainId: account.chainId,
            address: account.address!,
            creationNumber,
            sequenceNumber: +event.sequence_number,
            info: event
          } as IAptosEvent)
        }

        const version = Number((event as any).version)
        if (existingVersions.has(version)) {
          continue
        }
        if (uniqueVersions.has(version)) {
          continue
        }
        uniqueVersions.add(version)

        const tx = (await client.getTransactionByVersion(
          version
        )) as Types.Transaction_UserTransaction

        txsAdd.push({
          masterId: account.masterId,
          index: account.index,
          networkKind: account.networkKind,
          chainId: account.chainId,
          address: account.address!,
          type: '',
          index1: version,
          index2: Number(tx.sequence_number),
          info: {
            tx
          } as AptosTransactionInfo
        } as ITransaction)
      }

      await DB.transaction(
        'rw',
        [DB.transactions, DB.aptosEvents],
        async () => {
          if (eventsAdd.length) {
            await DB.aptosEvents.bulkAdd(eventsAdd)
          }
          if (txsAdd.length) {
            await DB.transactions.bulkAdd(txsAdd)
          }
        }
      )
    }
  }
}

function createAptosTransactionService(): ITransactionService {
  const serviceName = 'aptosTransactionService'
  let service
  if (ENV.inServiceWorker) {
    service = new AptosTransactionService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
  } else {
    service = SERVICE_WORKER_CLIENT.service<ITransactionService>(
      serviceName,
      // @ts-ignore
      new AptosTransactionServicePartial()
    )
  }
  return service
}

export const APTOS_TRANSACTION_SERVICE = createAptosTransactionService()

export function useAptosTxInfo(
  account?: IChainAccount,
  tx?: Types.Transaction_UserTransaction
) {
  return useMemo(() => {
    if (!account || !tx) {
      return
    }
    return parseAptosTxInfo(account.address!, tx)
  }, [account, tx])
}

export function useAptosTxCoinInfos(
  network?: INetwork,
  tx?: Types.Transaction_UserTransaction
) {
  const { value } = useAsync(async () => {
    if (!network || !tx) {
      return
    }
    const client = await getAptosClient(network)
    if (!client) {
      return
    }
    return parseAptosTxCoinEvents(client, tx)
  }, [network, tx])

  return value
}
