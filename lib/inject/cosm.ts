import type {
  AminoSignResponse,
  OfflineAminoSigner,
  StdSignDoc,
  StdSignature
} from '@cosmjs/amino'
import type {
  AccountData,
  DirectSignResponse,
  OfflineDirectSigner
} from '@cosmjs/proto-signing'
import { arrayify, hexlify } from '@ethersproject/bytes'
import type { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import Long from 'long'

import { ENV } from '~lib/env'

import {
  Context,
  EventEmitter,
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
      // bypass keplr specific methods
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

      return async (...params: any[]) => {
        params = [...params]

        switch (method) {
          case 'signAmino':
            return new CosmOfflineAminoSigner(service, params[0]).signAmino(
              params[1],
              params[2]
            )
          case 'signDirect':
            return new CosmOfflineSigner(service, params[0]).signDirect(
              params[1],
              params[2]
            )
          case 'signArbitrary' || 'verifyArbitrary':
            if (params[2] instanceof Uint8Array) {
              params[2] = Array.from(params[2])
            }
            break
        }

        params = params.map((param) => {
          return param instanceof Uint8Array
            ? hexlify(param)
            : param instanceof Long
            ? param.toString()
            : param
        })

        const response = await service.request({ method, params })

        switch (method) {
          case 'getKey':
            return {
              ...response,
              pubkey: arrayify(response.pubKey),
              address: arrayify(response.address)
            }
          case 'sendTx':
            return Buffer.from(response, 'hex')
          default:
            return response
        }
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

  async getAccounts(): Promise<readonly AccountData[]> {
    const { bech32Address, pubKey, algo } = await this.service.request({
      method: 'getKey',
      params: [this.chainId]
    })
    return [
      {
        address: bech32Address,
        algo: algo,
        pubkey: arrayify(pubKey)
      }
    ]
  }

  async signAmino(
    signerAddress: string,
    signDoc: StdSignDoc
  ): Promise<AminoSignResponse> {
    return await this.service.request({
      method: 'signTx',
      params: [this.chainId, signerAddress, signDoc]
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
    const doc: CosmSignDoc = {
      ...signDoc,
      bodyBytes: hexlify(signDoc.bodyBytes),
      authInfoBytes: hexlify(signDoc.authInfoBytes),
      accountNumber: signDoc.accountNumber.toString()
    }

    const response: CosmDirectSignResponse = await this.service.request({
      method: 'signTx',
      params: [this.chainId, signerAddress, doc]
    })
    const { signed, signature } = response

    return {
      signed: {
        ...signed,
        bodyBytes: arrayify(signed.bodyBytes),
        authInfoBytes: arrayify(signed.authInfoBytes),
        accountNumber: Long.fromString(signed.accountNumber)
      },
      signature
    }
  }
}

export interface CosmSignDoc {
  bodyBytes: string
  authInfoBytes: string
  chainId: string
  accountNumber: string
}

export interface CosmDirectSignResponse {
  signed: CosmSignDoc
  signature: StdSignature
}
