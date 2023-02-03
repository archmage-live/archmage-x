import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IChainAccount, IPendingTx, ITransaction } from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import { getCosmClient } from '~lib/services/provider/cosm/client'

import { ITransactionService } from '.'
import { BaseTransactionService } from './baseService'

// @ts-ignore
class CosmTransactionServicePartial
  extends BaseTransactionService
  implements ITransactionService {}

export class CosmTransactionService extends CosmTransactionServicePartial {
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

    const client = await getCosmClient(network)
    const queryClient = client.getQueryClient()

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

    let page = 0
    const limit = 100
    while (true) {
      const txsEventResponse = await queryClient.tx.getTxsEvent(
        {
          message: {
            sender: account.address
          }
        },
        { offset: page * limit, limit, isDesc: true }
      )

      if (txsEventResponse.txResponses.length < limit) {
        break
      }
    }
  }

  signAndSendTx(account: IChainAccount, ...args: any[]): Promise<IPendingTx> {
    throw new Error('not implemented')
  }

  addPendingTx(account: IChainAccount, ...args: any[]): Promise<IPendingTx> {
    throw new Error('not implemented')
  }

  waitForTx(
    pendingTx: IPendingTx,
    ...args: any[]
  ): Promise<ITransaction | undefined> {
    return Promise.resolve(undefined)
  }
}

function createCosmTransactionService(): ITransactionService {
  const serviceName = 'cosmTransactionService'
  let service
  if (ENV.inServiceWorker) {
    service = new CosmTransactionService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
  } else {
    service = SERVICE_WORKER_CLIENT.service<ITransactionService>(
      serviceName,
      // @ts-ignore
      new CosmTransactionServicePartial()
    )
  }
  return service
}

export const COSM_TRANSACTION_SERVICE = createCosmTransactionService()
