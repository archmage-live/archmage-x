import icon from 'data-base64:~assets/archmage.svg'
import {
  Abi,
  Account,
  AccountInterface,
  AllowArray,
  Call,
  InvocationsDetails,
  InvokeFunctionResponse,
  ProviderInterface,
  SequencerProvider,
  Signature,
  ec
} from 'starknet'

import { ENV } from '~lib/env'
import type {
  AddStarknetChainParameters,
  SwitchStarknetChainParameter,
  WatchStarknetAssetParameters
} from '~lib/services/provider/starknet/permissionedProvider'

import {
  Context,
  EventEmitter,
  EventType,
  Listener,
  RpcClientInjected
} from './client'

export const STARKNET_PROVIDER_NAME = 'starknetProvider'

export interface IStarknetProviderService extends EventEmitter {
  request(
    args: { method: string; params?: Array<any> },
    ctx?: Context
  ): Promise<any>
}

declare global {
  var starknet: any
  var starknet_archmage: any
}

if (
  !ENV.inServiceWorker &&
  process.env.PLASMO_PUBLIC_ENABLE_STARKNET &&
  !globalThis.archmage.starknet
) {
  const service =
    RpcClientInjected.instance().service<IStarknetProviderService>(
      STARKNET_PROVIDER_NAME
    )

  const listeners = new Map<string, Function[]>()

  const starknet = {
    id: 'archmage',
    name: 'Archmage',
    version: process.env.PLASMO_PUBLIC_VERSION,
    icon,

    provider: undefined as ProviderInterface | undefined,
    account: undefined as AccountInterface | undefined,
    selectedAddress: undefined as string | undefined,
    isConnected: false,

    request: async (
      message: Omit<RpcMessage, 'result'>
    ): Promise<RpcMessage['result']> => {
      switch (message.type) {
        case 'wallet_addStarknetChain':
        // pass through
        case 'wallet_switchStarknetChain':
        // pass through
        case 'wallet_watchAsset':
          await service.request({
            method: message.type,
            params: [message.params]
          })
          return true
        default:
          throw Error('Not implemented')
      }
    },

    enable: async (): Promise<string[]> => {
      const {
        network,
        addresses
      }: {
        network: {
          chainId: string
          baseUrl: string
        }
        addresses: string[]
      } = await service.request({ method: 'enable' })

      const provider = new SequencerProvider({ baseUrl: network.baseUrl })

      const account = new StarknetAccount(addresses[0], provider, service)

      starknet.provider = provider
      starknet.account = account
      starknet.selectedAddress = addresses[0]
      starknet.isConnected = true

      return addresses
    },

    on: (event: EventType, listener: Listener) => {
      let handlers = listeners.get(event)
      if (!handlers) {
        handlers = []
        listeners.set(event, handlers)
      }
      handlers.push(listener)
    },

    off: (event: EventType, listener: Listener) => {
      const handlers = listeners.get(event)
      if (!handlers?.length) {
        return
      }
      const index = handlers.findIndex((h) => h === listener)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    },

    isPreauthorized: async () => {
      // TODO
      return !!starknet.selectedAddress
    }
  }

  service.on(
    'networkChanged',
    ({ chainId, baseUrl }: { chainId: string; baseUrl: string }) => {
      starknet.provider = new SequencerProvider({ baseUrl })
      if (starknet.selectedAddress) {
        starknet.account = new StarknetAccount(
          starknet.selectedAddress,
          starknet.provider,
          service
        )
        starknet.isConnected = true
      }

      listeners.get('networkChanged')?.forEach((handler) => handler(chainId))
    }
  )

  service.on('accountsChanged', async () => {
    const addresses: string[] = await service.request({ method: 'accounts' })

    if (addresses.length) {
      starknet.account = new StarknetAccount(
        addresses[0],
        starknet.provider,
        service
      )
      starknet.selectedAddress = addresses[0]
      starknet.isConnected = true
    } else {
      starknet.account = undefined
      starknet.selectedAddress = undefined
      starknet.isConnected = false
    }

    listeners.get('accountsChanged')?.forEach((handler) => handler(addresses))
  })

  globalThis.starknet = starknet
  globalThis.starknet_archmage = starknet
  globalThis.archmage.starknet = starknet
}

class StarknetAccount extends Account {
  constructor(
    address: string,
    provider: ProviderInterface | undefined,
    private service: IStarknetProviderService
  ) {
    const keyPair = ec.getKeyPair(0) // dummy one, never used
    super(provider || {}, address, keyPair)
  }

  public override async execute(
    calls: AllowArray<Call>,
    abis?: Abi[],
    transactionsDetail: InvocationsDetails = {}
  ): Promise<InvokeFunctionResponse> {
    const txHash = await this.service.request({
      method: 'execute',
      params: [calls, abis, transactionsDetail]
    })
    return {
      transaction_hash: txHash
    }
  }

  public override async signMessage(typedData: any): Promise<Signature> {
    return await this.service.request({
      method: 'signMessage',
      params: [typedData]
    })
  }
}

type RpcMessage =
  | {
      type: 'wallet_watchAsset'
      params: WatchStarknetAssetParameters
      result: boolean
    }
  | {
      type: 'wallet_addStarknetChain'
      params: AddStarknetChainParameters
      result: boolean
    }
  | {
      type: 'wallet_switchStarknetChain'
      params: SwitchStarknetChainParameter
      result: boolean
    }
  | {
      type: string
      params: any
      result: never
    }
