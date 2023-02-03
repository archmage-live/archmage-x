import {
  AminoSignResponse,
  StdSignDoc,
  StdSignature,
  pubkeyToRawAddress,
  serializeSignDoc
} from '@cosmjs/amino'
import { Secp256k1, Secp256k1Signature, Sha256 } from '@cosmjs/crypto'
import { fromBase64, fromBech32, toBech32 } from '@cosmjs/encoding'
import { DirectSignResponse } from '@cosmjs/proto-signing'
import type { ChainInfo as CosmChainInfo } from '@keplr-wallet/types'
import assert from 'assert'
import { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { ethErrors } from 'eth-rpc-errors'
import { ethers } from 'ethers'

import { getActiveNetwork, getActiveNetworkByKind } from '~lib/active'
import { Context } from '~lib/inject/client'
import { NetworkKind } from '~lib/network'
import { validateCosmChainInfo } from '~lib/network/cosm/validate'
import { INetwork, PSEUDO_INDEX } from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import { BasePermissionedProvider } from '~lib/services/provider/base'
import { WALLET_SERVICE } from '~lib/services/wallet'
import {
  HardwareWalletType,
  getSigningWallet,
  hasWalletKeystore,
  isWalletHardware
} from '~lib/wallet'

import { CosmClient, getCosmClient } from './client'
import { CosmProvider, makeADR36AminoSignDoc } from './provider'

export class CosmPermissionedProvider extends BasePermissionedProvider {
  private constructor(
    network: INetwork,
    public client: CosmClient,
    origin: string
  ) {
    super(network, origin)
    assert(network.kind === NetworkKind.COSM)
  }

  static async fromMayThrow(
    fromUrl: string
  ): Promise<CosmPermissionedProvider> {
    const provider = await CosmPermissionedProvider.from(fromUrl)
    if (!provider) {
      // no active network
      throw ethErrors.provider.disconnected()
    }
    return provider
  }

  static async from(
    fromUrl: string
  ): Promise<CosmPermissionedProvider | undefined> {
    const network = await getActiveNetworkByKind(NetworkKind.COSM)
    if (!network) {
      return
    }

    const client = await getCosmClient(network)

    const permissionedProvider = new CosmPermissionedProvider(
      network,
      client,
      new URL(fromUrl).origin
    )

    await permissionedProvider.fetchConnectedAccounts()

    return permissionedProvider
  }

  async request(ctx: Context, method: string, params: any[]) {
    switch (method) {
      case 'enable':
        return this.enable(ctx, params[0])
      case 'experimentalSuggestChain':
        return this.addChain(ctx, params[0])
      case 'switchChain':
        return this.switchChain(ctx, params[0])
      case 'getKey':
        return this.getKey(ctx, params[0])
      case 'isProtobufSignerSupported':
        return this.isProtobufSignerSupported(ctx)
      case 'signTx':
        return this.signTx(ctx, params[0])
      case 'sendTx':
        return this.sendTx(ctx, params[0], params[1], params[2])
      case 'signArbitrary':
        return this.signArbitrary(ctx, params[0], params[1], params[2])
      case 'verifyArbitrary':
        return this.verifyArbitrary(
          ctx,
          params[0],
          params[1],
          params[2],
          params[3]
        )
      case 'signEthereum':
        // TODO: https://docs.keplr.app/api/#request-ethereum-signature
        return this.signArbitrary(ctx, params[0], params[1], params[2])
    }

    throw ethErrors.rpc.methodNotSupported()
  }

  async enable(ctx: Context, chainIds: string | string[]) {
    // NOTE: we only use the first chain id, and ignore other chains
    const chainId = Array.isArray(chainIds) ? chainIds[0] : chainIds
    await this.switchChain(ctx, chainId)

    await this.requestAccounts(ctx)
  }

  async addChain(ctx: Context, chainInfo: CosmChainInfo) {
    const chainId = chainInfo.chainId
    if (typeof chainId !== 'string') {
      throw ethErrors.rpc.invalidParams('Invalid chainId')
    }

    const existing = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.COSM,
      chainId
    })
    if (existing) {
      const activeNetwork = await getActiveNetwork()
      if (
        activeNetwork?.kind === NetworkKind.COSM &&
        existing.chainId === activeNetwork.chainId
      ) {
        return
      }

      return this.switchChain(ctx, chainId)
    }

    chainInfo = await validateCosmChainInfo(chainInfo)

    await this._addChain(ctx, NetworkKind.COSM, chainId, chainInfo)
  }

  async switchChain(ctx: Context, chainId: any) {
    if (typeof chainId !== 'string') {
      throw ethErrors.rpc.invalidParams('Invalid chainId')
    }
    await this._switchChain(ctx, NetworkKind.COSM, chainId)
  }

  async getKey(
    ctx: Context,
    chainId: string
  ): Promise<{
    name: string
    algo: string
    pubKey: Uint8Array
    address: Uint8Array
    bech32Address: string
    isNanoLedger: boolean
    isKeystone: boolean
  }> {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    await this.switchChain(ctx, chainId)

    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.COSM,
      chainId
    })
    if (!network) {
      throw ethErrors.rpc.invalidRequest(`Chain ${chainId} not supported`)
    }

    const data = fromBech32(this.account.address).data
    const prefix = (network.info as CosmChainInfo).bech32Config
      .bech32PrefixAccAddr
    const bech32Address = toBech32(prefix, data)

    const wallet = await WALLET_SERVICE.getWallet(this.account.masterId)
    const subWallet = await WALLET_SERVICE.getSubWallet({
      masterId: this.account.masterId,
      index: this.account.index
    })
    assert(wallet && subWallet)

    const signer = await getSigningWallet(this.account)

    const hwType = isWalletHardware(wallet.type)
      ? wallet.info.hwType
      : undefined

    return {
      name:
        subWallet.index === PSEUDO_INDEX
          ? wallet.name
          : `${wallet.name} / ${subWallet.name}`,
      algo: 'secp256k1',
      pubKey: signer?.publicKey
        ? ethers.utils.arrayify(signer.publicKey)
        : Uint8Array.of(), // TODO
      address: data,
      bech32Address: bech32Address,
      isNanoLedger: hwType === HardwareWalletType.LEDGER,
      isKeystone: false // TODO
    }
  }

  async isProtobufSignerSupported(ctx: Context): Promise<boolean> {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }
    const wallet = await WALLET_SERVICE.getWallet(this.account.masterId)
    assert(wallet)

    // TODO: WalletConnect?
    return hasWalletKeystore(wallet.type)
  }

  async signTx(
    ctx: Context,
    tx: SignDoc | StdSignDoc
  ): Promise<DirectSignResponse | AminoSignResponse> {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    const provider = new CosmProvider(this.client, this.network)

    const { txParams } = await provider.populateTransaction(this.account, tx)

    return provider.signTransaction(this.account, txParams)
  }

  async sendTx(
    ctx: Context,
    chainId: string,
    tx: Uint8Array,
    mode?: BroadcastMode
  ): Promise<Uint8Array> {
    // TODO: broadcast mode

    await this.switchChain(ctx, chainId)

    const response = await this.client.broadcastTx(tx)
    return Buffer.from(response.transactionHash, 'hex')
  }

  async signArbitrary(
    ctx: Context,
    chainId: string,
    signer: string,
    data: string | Uint8Array
  ): Promise<StdSignature> {
    await this.switchChain(ctx, chainId)

    if (!this.account?.address || signer !== this.account.address) {
      throw ethErrors.provider.unauthorized()
    }

    const signDoc = makeADR36AminoSignDoc(signer, data)

    return (await this.signTx(ctx, signDoc)).signature
  }

  async verifyArbitrary(
    ctx: Context,
    chainId: string,
    signer: string,
    data: string | Uint8Array,
    signature: StdSignature
  ): Promise<boolean> {
    await this.switchChain(ctx, chainId)

    const signDoc = makeADR36AminoSignDoc(signer, data)

    const { data: signerAddress } = fromBech32(signer)
    if (
      !Buffer.from(signerAddress).equals(pubkeyToRawAddress(signature.pub_key))
    ) {
      throw ethErrors.rpc.invalidRequest('Unmatched signer')
    }

    return await Secp256k1.verifySignature(
      Secp256k1Signature.fromFixedLength(fromBase64(signature.signature)),
      new Sha256(serializeSignDoc(signDoc)).digest(),
      fromBase64(signature.pub_key.value)
    )
  }
}

export declare enum BroadcastMode {
  /** Return after tx commit */
  Block = 'block',
  /** Return after CheckTx */
  Sync = 'sync',
  /** Return right away */
  Async = 'async'
}
