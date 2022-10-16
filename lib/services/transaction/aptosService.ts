import { AptosClient, Types } from 'aptos'

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

import { ITransactionService } from '.'
import { BaseTransactionService } from './baseService'

export interface AptosPendingTxInfo {
  tx: Types.Transaction_PendingTransaction

  origin: string
}

export interface AptosTransactionInfo {
  tx: Types.Transaction_UserTransaction

  origin?: string // only exists for local sent transaction
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

    const resources = await client.getAccountResources(account.address)

    const transactions = (await client.getAccountTransactions(account.address, {
      start: 0,
      limit: 100
    })) as (
      | Types.Transaction_PendingTransaction
      | Types.Transaction_UserTransaction
    )[]
    if (!transactions.length) {
      return
    }
  }
}

function isPendingTransaction(
  tx: Types.Transaction_PendingTransaction | Types.Transaction_UserTransaction
): tx is Types.Transaction_PendingTransaction {
  return !(tx as Types.Transaction_UserTransaction).version
}

async function fetchTxs(client: AptosClient, account: IChainAccount) {
  const txs = (await client.getAccountTransactions(account.address!, {
    start: 0,
    limit: 100
  })) as (
    | Types.Transaction_PendingTransaction
    | Types.Transaction_UserTransaction
  )[]
  for (const tx of txs) {
    if (isPendingTransaction(tx)) {
    } else {
    }
  }
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

      if (!events.length) {
        break
      }

      const versions = events.map((event) => Number((event as any).version))
      const uniqueVersions = new Set<number>()
      const query = []
      for (const version of versions) {
        if (uniqueVersions.has(version)) {
          continue
        }
        uniqueVersions.add(version)
        query.push([
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
        .anyOf(query)
        .toArray()
      const existingVersions = new Set(existingTxs.map((tx) => tx.index1))

      const eventsAdd: IAptosEvent[] = []
      const txsAdd: ITransaction[] = []
      uniqueVersions.clear()
      for (const event of events) {
        const version = Number((event as any).version)
        if (existingVersions.has(version)) {
          continue
        }

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
