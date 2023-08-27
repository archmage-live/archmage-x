import archmageLogo from 'data-base64:~assets/archmage.svg'
import argentLogo from 'data-base64:~assets/thirdparty/argent.svg'
import braavosLogo from 'data-base64:~assets/thirdparty/braavos.svg'
import type { RpcMessage, StarknetWindowObject } from 'get-starknet-core'
import {
  Abi,
  Account,
  AccountInterface,
  AllowArray,
  Call,
  DeclareContractPayload,
  DeclareContractResponse,
  DeclareSignerDetails,
  DeployAccountContractPayload,
  DeployAccountSignerDetails,
  DeployContractResponse,
  InvocationsDetails,
  InvocationsSignerDetails,
  InvokeFunctionResponse,
  ProviderInterface,
  SequencerProvider,
  Signature,
  SignerInterface,
  TypedData
} from 'starknet'

import { isBackgroundWorker } from '~lib/detect'
import { stringifyBigNumberish } from '~lib/utils'

import {
  Context,
  EventEmitter,
  EventType,
  Listener,
  RpcClientInjected,
  context
} from './client'

export const STARKNET_PROVIDER_NAME = 'starknetProvider'

export interface IStarknetProviderService extends EventEmitter {
  request(
    args: { method: string; params?: Array<any> },
    ctx?: Context
  ): Promise<any>
}

declare global {
  var starknet: StarknetWindowObject | undefined
  var starknet_archmage: StarknetWindowObject | undefined
  var starknet_argentX: StarknetWindowObject | undefined
  var starknet_braavos: StarknetWindowObject | undefined
}

if (
  !isBackgroundWorker() &&
  process.env.PLASMO_PUBLIC_ENABLE_STARKNET &&
  !globalThis.archmage.starknet
) {
  const service =
    RpcClientInjected.instance().service<IStarknetProviderService>(
      STARKNET_PROVIDER_NAME
    )

  const listeners = new Map<string, Function[]>()

  const starknet: StarknetWindowObject = {
    id: 'archmage',
    name: 'Archmage',
    version: process.env.PLASMO_PUBLIC_VERSION || '',
    icon: archmageLogo,

    provider: undefined,
    account: undefined,
    selectedAddress: undefined,
    chainId: undefined,
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
          await service.request(
            {
              method: message.type,
              params: [message.params]
            },
            context()
          )
          return true
        default:
          throw Error('Not implemented')
      }
    },

    enable: async (options?: {
      starknetVersion?: 'v4' | 'v5'
    }): Promise<string[]> => {
      /* if (options?.starknetVersion === 'v4') {
        // we don't support starknet.js v4
        return []
      } */

      const {
        network,
        addresses
      }: {
        network: {
          chainId: string
          baseUrl: string
        }
        addresses: string[]
      } = await service.request({ method: 'enable' }, context())

      // TODO: delegate to archmage's network provider
      const provider = new SequencerProvider({ baseUrl: network.baseUrl })

      const account = new StarknetAccount(addresses[0], provider, service)

      starknet.provider = provider
      starknet.account = account
      starknet.selectedAddress = addresses[0]
      starknet.chainId = network.chainId
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
      // TODO: what's this?
      // return !!starknet.selectedAddress
      return true
    }
  }

  service.on(
    'networkChanged',
    ({ chainId, baseUrl }: { chainId?: string; baseUrl?: string }) => {
      starknet.chainId = chainId
      if (baseUrl) {
        starknet.provider = new SequencerProvider({ baseUrl })
      } else {
        starknet.provider = undefined
      }
      if (starknet.provider && starknet.selectedAddress) {
        starknet.account = new StarknetAccount(
          starknet.selectedAddress,
          starknet.provider,
          service
        )
        starknet.isConnected = true as any
      } else {
        starknet.account = undefined
        starknet.isConnected = false
      }

      listeners.get('networkChanged')?.forEach((handler) => handler(chainId))
    }
  )

  service.on('accountsChanged', async () => {
    const addresses: string[] = await service.request(
      { method: 'accounts' },
      context()
    )

    if (addresses.length && starknet.provider) {
      starknet.account = new StarknetAccount(
        addresses[0],
        starknet.provider as ProviderInterface,
        service
      )
      starknet.selectedAddress = addresses[0]
      starknet.isConnected = true as any
    } else {
      starknet.account = undefined
      starknet.selectedAddress = undefined
      starknet.isConnected = false
    }

    listeners.get('accountsChanged')?.forEach((handler) => handler(addresses))
  })

  globalThis.starknet = starknet
  globalThis.starknet_archmage = starknet
  globalThis.starknet_argentX = new Proxy(starknet, {
    get: (target: StarknetWindowObject, method: string | symbol) => {
      if (method === 'id') {
        return 'argentX'
      } else if (method === 'name') {
        return 'Argent X'
      } else if (method === 'icon') {
        return argentLogo
      } else if (typeof (target as any)[method] === 'function') {
        return (target as any)[method].bind(target)
      } else {
        return (target as any)[method]
      }
    }
  })
  globalThis.starknet_braavos = new Proxy(starknet, {
    get: (target: StarknetWindowObject, method: string | symbol) => {
      if (method === 'id') {
        return 'braavos'
      } else if (method === 'name') {
        return 'Braavos'
      } else if (method === 'icon') {
        return braavosLogo
      } else if (typeof (target as any)[method] === 'function') {
        return (target as any)[method].bind(target)
      } else {
        return (target as any)[method]
      }
    }
  })
  globalThis.archmage.starknet = starknet
}

class StarknetAccount extends Account implements AccountInterface {
  constructor(
    address: string,
    provider: ProviderInterface,
    private service: IStarknetProviderService
  ) {
    const signer = new StarknetSigner(service)

    super(provider || {}, address, signer)
  }

  /**
   * Override the implementation of `execute`/`deployAccount`/`declare` to display a beautiful consent UI.
   */

  override async execute(
    calls: AllowArray<Call>,
    abis?: Abi[],
    transactionsDetail?: InvocationsDetails
  ): Promise<InvokeFunctionResponse> {
    return this.service.request(
      {
        method: 'execute',
        params: stringifyBigNumberish([calls, abis, transactionsDetail])
      },
      context()
    )
  }

  override async deployAccount(
    contractPayload: DeployAccountContractPayload,
    transactionsDetail?: InvocationsDetails
  ): Promise<DeployContractResponse> {
    return this.service.request(
      {
        method: 'deployAccount',
        params: stringifyBigNumberish([contractPayload, transactionsDetail])
      },
      context()
    )
  }

  override async declare(
    payload: DeclareContractPayload,
    transactionsDetail?: InvocationsDetails
  ): Promise<DeclareContractResponse> {
    return this.service.request(
      {
        method: 'declare',
        params: stringifyBigNumberish([payload, transactionsDetail])
      },
      context()
    )
  }
}

class StarknetSigner implements SignerInterface {
  constructor(private service: IStarknetProviderService) {}

  getPubKey(): Promise<string> {
    return this.service.request({ method: 'getPubKey' }, context())
  }

  signMessage(
    typedData: TypedData,
    accountAddress: string
  ): Promise<Signature> {
    return this.service.request(
      { method: 'signMessage', params: [typedData, accountAddress] },
      context()
    )
  }

  signTransaction(
    transactions: Call[],
    transactionsDetail: InvocationsSignerDetails,
    abis?: Abi[]
  ): Promise<Signature> {
    return this.service.request(
      {
        method: 'signTransaction',
        params: stringifyBigNumberish([transactions, transactionsDetail, abis])
      },
      context()
    )
  }

  signDeployAccountTransaction(
    transaction: DeployAccountSignerDetails
  ): Promise<Signature> {
    return this.service.request(
      {
        method: 'signDeployAccountTransaction',
        params: [stringifyBigNumberish(transaction)]
      },
      context()
    )
  }

  signDeclareTransaction(
    transaction: DeclareSignerDetails
  ): Promise<Signature> {
    return this.service.request(
      {
        method: 'signDeclareTransaction',
        params: [stringifyBigNumberish(transaction)]
      },
      context()
    )
  }
}
