import {
  AuthExtension,
  BankExtension,
  HttpEndpoint,
  IbcExtension,
  QueryClient,
  StakingExtension,
  StargateClient,
  StargateClientOptions,
  setupAuthExtension,
  setupBankExtension,
  setupIbcExtension,
  setupStakingExtension
} from '@cosmjs/stargate'
import { Tendermint34Client } from '@cosmjs/tendermint-rpc'

import { CosmAppChainInfo } from '~lib/network/cosm'
import {
  TxExtension,
  setupTxExtension
} from '~lib/network/cosm/modules/tx/queries'
import { ChainId, INetwork } from '~lib/schema'

export class CosmClient extends StargateClient {
  static async connect(
    endpoint: string | HttpEndpoint,
    options: StargateClientOptions = {}
  ): Promise<CosmClient> {
    const tmClient = await Tendermint34Client.connect(endpoint)
    return new CosmClient(tmClient, options)
  }

  getQueryClient(): QueryClient &
    AuthExtension &
    BankExtension &
    StakingExtension &
    TxExtension &
    IbcExtension {
    return QueryClient.withExtensions(
      this.forceGetTmClient(),
      setupAuthExtension,
      setupBankExtension,
      setupStakingExtension,
      setupTxExtension,
      setupIbcExtension
    )
  }
}

const COSM_CLIENTS = new Map<ChainId, CosmClient>()

export async function getCosmClient(network: INetwork) {
  let client = COSM_CLIENTS.get(network.id)
  if (!client) {
    const info = network.info as CosmAppChainInfo
    client = await CosmClient.connect(info.rest)
    COSM_CLIENTS.set(network.id, client)
  }
  return client
}
