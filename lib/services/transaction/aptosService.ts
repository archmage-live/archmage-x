import {
  AptosAccount,
  AptosClient,
  HexString,
  TxnBuilderTypes,
  Types
} from 'aptos'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import {
  IAptosEvent,
  IChainAccount,
  IPendingTx,
  ITransaction
} from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import { getAptosClient } from '~lib/services/provider/aptos/client'
import {
  FakeAptosAccount,
  isEntryFunctionPayload,
  isScriptPayload
} from '~lib/services/provider/aptos/types'
import { parseAptosTxInfo } from '~lib/services/transaction/aptosParse'

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

  const userTransaction: Types.Transaction_UserTransaction | undefined =
    isPendingTransaction(tx)
      ? (info as AptosPendingTxInfo).simulatedTx
      : isUserTransaction(tx)
      ? tx
      : undefined
  const { success, type, functionShort, to, amount } = userTransaction
    ? parseAptosTxInfo(transaction.address, userTransaction)
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
    isPending: isPendingTransaction(tx),
    isCancelled: false, // TODO
    name,
    to,
    origin: info.origin,
    amount,
    hash: tx.hash,
    nonce: +tx.sequence_number,
    status: isPendingTransaction(tx)
      ? TransactionStatus.PENDING
      : success
      ? TransactionStatus.CONFIRMED
      : TransactionStatus.CONFIRMED_FAILURE,
    timestamp: isUserTransaction(tx)
      ? Math.floor(+tx.timestamp / 1000)
      : undefined
  } as TransactionInfo
}

// @ts-ignore
class AptosTransactionServicePartial
  extends BaseTransactionService
  implements ITransactionService {}

export class AptosTransactionService extends AptosTransactionServicePartial {
  async waitForTx(
    pendingTx: IPendingTx,
    ...args: any[]
  ): Promise<ITransaction | undefined> {
    // TODO
    return
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

function isPendingTransaction(
  tx: Types.Transaction_PendingTransaction | Types.Transaction_UserTransaction
): tx is Types.Transaction_PendingTransaction {
  return tx.type === 'pending_transaction'
}

function isUserTransaction(
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
        start: lastTx ? lastTx.index1 + 1 : 0, // `index1` as tx version
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
      if (isPendingTransaction(tx)) {
        pendingTxQuery.push([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          +tx.sequence_number
        ])
      }
      if (isUserTransaction(tx)) {
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
      if (isPendingTransaction(tx)) {
        if (existingPendingTxsSet.has(+tx.sequence_number)) {
          continue
        }

        // const aptosAccount = new FakeAptosAccount(
        //   HexString.ensure(account.address!) // TODO
        // )
        // let payload
        // if (isEntryFunctionPayload(tx.payload)) {
        //   const splits = tx.payload.function.split('::')
        //
        //   payload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
        //     TxnBuilderTypes.EntryFunction.natural(
        //       splits.slice(0, splits.length - 1).join('::'),
        //       splits[splits.length - 1],
        //       tx.payload.type_arguments.map((type) => parseTypeTag(type)),
        //       tx.payload.arguments.map((arg: any) =>
        //         new HexString(arg).toUint8Array()
        //       )
        //     )
        //   )
        // } else if (isScriptPayload(tx.payload)) {
        //
        // }
        // const rawTx = new TxnBuilderTypes.RawTransaction(
        //   TxnBuilderTypes.AccountAddress.fromHex(tx.sender),
        //   BigInt(tx.sequence_number),
        //   payload as any,
        //   BigInt(tx.max_gas_amount),
        //   BigInt(tx.gas_unit_price),
        //   BigInt(tx.expiration_timestamp_secs),
        //   new TxnBuilderTypes.ChainId(Number(account.chainId))
        // )
        // const simulatedTx = await client.simulateTransaction(
        //   aptosAccount as unknown as AptosAccount,
        //   rawTx
        // )

        addPendingTxs.push({
          masterId: account.masterId,
          index: account.index,
          networkKind: account.networkKind,
          chainId: account.chainId,
          address: account.address!,
          nonce: Number(tx.sequence_number),
          info: {
            tx
            // simulatedTx: simulatedTx.length ? simulatedTx[0] : undefined
          } as AptosPendingTxInfo
        } as IPendingTx)
      }

      if (isUserTransaction(tx)) {
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
          existingPendingTxsForTxsMap.get(tx.index2))
    )
    const deletePendingTxs = existingPendingTxsForTxs.map((tx) => tx.id)

    await DB.transaction('rw', [DB.pendingTxs, DB.transactions], async () => {
      if (addPendingTxs.length) await DB.pendingTxs.bulkAdd(addPendingTxs)
      if (deletePendingTxs) await DB.pendingTxs.bulkDelete(deletePendingTxs)
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
      try {
        events = await client.getEventsByCreationNumber(
          account.address!,
          creationNumber,
          {
            start: nextSequenceNumber,
            limit: 100
          }
        )
      } catch (err) {
        // monotonically increased creationNumber break off
        console.error(err)
        return
      }

      console.log(creationNumber, nextSequenceNumber, events.length)
      if (!events.length) {
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

function parseTypeTag(typeTag: any): TxnBuilderTypes.TypeTag {
  if (typeTag.vector) {
    return new TxnBuilderTypes.TypeTagVector(parseTypeTag(typeTag.vector))
  }

  if (typeTag.struct) {
    const {
      address,
      module,
      name,
      type_args
    }: {
      address: string
      module: string
      name: string
      type_args: any[]
    } = typeTag.struct

    const typeArgs = type_args.map((arg) => parseTypeTag(arg))
    const structTag = new TxnBuilderTypes.StructTag(
      TxnBuilderTypes.AccountAddress.fromHex(address),
      new TxnBuilderTypes.Identifier(module),
      new TxnBuilderTypes.Identifier(name),
      typeArgs
    )

    return new TxnBuilderTypes.TypeTagStruct(structTag)
  }

  switch (typeTag) {
    case 'bool':
      return new TxnBuilderTypes.TypeTagBool()
    case 'u8':
      return new TxnBuilderTypes.TypeTagU8()
    case 'u64':
      return new TxnBuilderTypes.TypeTagU64()
    case 'u128':
      return new TxnBuilderTypes.TypeTagU128()
    case 'address':
      return new TxnBuilderTypes.TypeTagAddress()
    case 'signer':
      return new TxnBuilderTypes.TypeTagSigner()
    default:
      throw new Error('Unknown type tag')
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
