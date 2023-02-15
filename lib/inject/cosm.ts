import type {
  AminoSignResponse,
  OfflineAminoSigner,
  StdSignDoc
} from '@cosmjs/amino'
import type {
  AccountData,
  DirectSignResponse,
  OfflineDirectSigner,
  OfflineSigner
} from '@cosmjs/proto-signing'
import type { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx'

import { ENV } from '~lib/env'

import {
  Context,
  EventEmitter,
  Listener,
  RpcClientInjected,
  isMsgEventMethod
} from './client'

export const COSM_PROVIDER_NAME = 'cosmProvider'

export interface ICosmProviderService extends EventEmitter {
  request(
    args: { method: string; params?: Array<any> },
    ctx?: Context
  ): Promise<any>
}

declare global {
  var cosm: any
  var keplr: any
}

if (
  !ENV.inServiceWorker &&
  process.env.PLASMO_PUBLIC_ENABLE_COSMOS &&
  !globalThis.archmage.cosm
) {
  const service =
    RpcClientInjected.instance().service<ICosmProviderService>(
      COSM_PROVIDER_NAME
    )

  service.on('accountsChanged', () => {
    globalThis.dispatchEvent(new CustomEvent('keplr_keystorechange'))
  })

  const cosm = new Proxy(service, {
    get: (service, method: string) => {
      switch (method) {
        case 'then':
          return undefined
        case '__core__getAnalyticsId':
          return undefined
      }

      if (isMsgEventMethod(method)) {
        return service[method]
      }

      switch (method) {
        case 'getOfflineSigner':
          return (...params: any[]) => {
            return new CosmOfflineSigner(service, params[0])
          }
        case 'getOfflineSignerOnlyAmino':
          return (...params: any[]) => {
            return new CosmOfflineAminoSigner(service, params[0])
          }
        case 'getOfflineSignerAuto':
          return async (...params: any[]) => {
            if (
              await service.request({
                method: 'isProtobufSignerSupported'
              })
            ) {
              return new CosmOfflineSigner(service, params[0])
            } else {
              return new CosmOfflineAminoSigner(service, params[0])
            }
          }
      }

      return (...params: any[]) => {
        return service.request({ method, params })
      }
    }
  })

  globalThis.cosm = cosm
  globalThis.keplr = cosm
  globalThis.archmage.cosm = cosm
}

class CosmOfflineAminoSigner implements OfflineAminoSigner {
  constructor(
    protected service: ICosmProviderService,
    protected chainId: string
  ) {}

  protected async switchChain() {
    await this.service.request({
      method: 'switchChain',
      params: [this.chainId]
    })
  }

  async getAccounts(): Promise<readonly AccountData[]> {
    await this.switchChain()

    const { bech32Address, pubKey, algo } = await this.service.request({
      method: 'getKey',
      params: [this.chainId]
    })
    return [
      {
        address: bech32Address,
        algo: algo,
        pubkey: pubKey
      }
    ]
  }

  async signAmino(
    signerAddress: string,
    signDoc: StdSignDoc
  ): Promise<AminoSignResponse> {
    await this.switchChain()

    return await this.service.request({
      method: 'signTx',
      params: [signerAddress, signDoc]
    })
  }
}

class CosmOfflineSigner
  extends CosmOfflineAminoSigner
  implements OfflineDirectSigner
{
  async signDirect(
    signerAddress: string,
    signDoc: SignDoc
  ): Promise<DirectSignResponse> {
    await this.switchChain()

    return await this.service.request({
      method: 'signTx',
      params: [signerAddress, signDoc]
    })
  }
}
