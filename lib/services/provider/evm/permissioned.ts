import { VoidSigner } from '@ethersproject/abstract-signer'
import { BigNumberish } from '@ethersproject/bignumber'
import { BytesLike } from '@ethersproject/bytes'
import { Logger } from '@ethersproject/logger'
import { version } from '@ethersproject/providers/lib/_version'
import { AccessListish } from '@ethersproject/transactions'
import { ethErrors } from 'eth-rpc-errors'
import { ethers } from 'ethers'

import {
  getActiveNetwork,
  getActiveWallet,
  setActiveNetwork
} from '~lib/active'
import { NetworkKind } from '~lib/network'
import { EvmChainInfo, EvmExplorer, NativeCurrency } from '~lib/network/evm'
import { Context } from '~lib/rpc'
import { IChainAccount, INetwork } from '~lib/schema'
import { CONNECTED_SITE_SERVICE } from '~lib/services/connectedSiteService'
import {
  CONSENT_SERVICE,
  ConsentType,
  Permission,
  RequestPermissionPayload
} from '~lib/services/consentService'
import { NETWORK_SERVICE } from '~lib/services/network'
import { WALLET_SERVICE } from '~lib/services/walletService'

import { EvmProvider } from '.'

const logger = new Logger(version)

export type TransactionParams = {
  to?: string
  from?: string
  nonce?: BigNumberish // ignored

  gas?: BigNumberish // gas limit
  gasPrice?: BigNumberish

  data?: BytesLike
  value?: BigNumberish
  chainId?: number // currently ignored

  type?: number
  accessList?: AccessListish

  maxPriorityFeePerGas?: BigNumberish
  maxFeePerGas?: BigNumberish
}

export const allowedTransactionKeys: Array<string> = [
  'accessList',
  'chainId',
  'data',
  'from',
  'gas',
  'gasPrice',
  'maxFeePerGas',
  'maxPriorityFeePerGas',
  'nonce',
  'to',
  'type',
  'value'
]

export class EvmPermissionedProvider {
  network: INetwork
  provider: EvmProvider
  origin: string
  wallet?: IChainAccount

  private constructor(network: INetwork, fromUrl: string) {
    this.network = network
    this.provider = new EvmProvider(network)
    this.origin = new URL(fromUrl).origin
  }

  static async from(fromUrl: string): Promise<EvmPermissionedProvider> {
    const activeNetwork = await getActiveNetwork()
    if (!activeNetwork) {
      // no active network
      throw ethErrors.provider.disconnected()
    }

    const provider = new EvmPermissionedProvider(activeNetwork, fromUrl)

    await provider.getWallet()

    return provider
  }

  private async getWallet() {
    const connections = await CONNECTED_SITE_SERVICE.getConnectedSitesBySite(
      this.origin
    )

    // has connected accounts
    if (connections.length) {
      const activeWallet = await getActiveWallet()

      let conn
      if (connections.length > 1 && activeWallet) {
        // prefer current active wallet
        conn = connections.find(
          (conn) =>
            conn.masterId === activeWallet.walletInfo.masterId &&
            conn.index === activeWallet.walletInfo.index
        )
      }
      if (!conn) {
        // fallback to first connection
        conn = connections[0]
      }

      this.wallet = await WALLET_SERVICE.getChainAccount({
        masterId: conn.masterId,
        index: conn.index,
        networkKind: this.network.kind,
        chainId: this.network.chainId
      })
    }
  }

  private async checkTransaction(
    signer: VoidSigner,
    params: TransactionParams
  ) {
    for (const key in params) {
      if (allowedTransactionKeys.indexOf(key) === -1) {
        logger.throwArgumentError(
          'invalid transaction key: ' + key,
          'transaction',
          params
        )
      }
    }

    const from = await signer.getAddress()
    if (params.from == null) {
      params.from = from
    } else {
      // Make sure any provided address matches this signer
      if (params.from.toLowerCase() !== from.toLowerCase()) {
        logger.throwArgumentError(
          'from address mismatch',
          'transaction',
          params
        )
      }
    }
  }

  async send(ctx: Context, method: string, params: Array<any>): Promise<any> {
    switch (method) {
      case 'eth_accounts':
        return this.getAccounts()
      case 'eth_requestAccounts':
        return this.requestAccounts(ctx)
      case 'wallet_getPermissions':
        return this.getPermissions()
      case 'wallet_requestPermissions':
        return this.requestPermissions(ctx, params)
      case 'wallet_addEthereumChain':
        return this.addEthereumChain(params)
      case 'wallet_switchEthereumChain':
        return this.switchEthereumChain(params)
      case 'wallet_watchAsset':
        return this.watchAsset(params)
      case 'eth_sign':
        return this.legacySignMessage(params)
      case 'personal_sign':
        return this.signMessage(params)
      case 'eth_signTypedData':
      // fallthrough
      case 'eth_signTypedData_v1':
      // fallthrough
      case 'eth_signTypedData_v3':
        throw ethErrors.provider.unsupportedMethod(
          'Please use eth_signTypedData_v4 instead.'
        )
      case 'eth_signTypedData_v4':
        return this.signTypedData(params)
      case 'eth_sendTransaction':
        return this.sendTransaction(ctx, params)
    }

    return this.provider.send(method, params)
  }

  async sendTransaction(ctx: Context, [params]: Array<any>) {
    if (!this.wallet) {
      throw ethErrors.provider.unauthorized()
    }

    const voidSigner = new VoidSigner(this.wallet.address, this.provider)
    const txRequest = await voidSigner.populateTransaction(params[0])

    return CONSENT_SERVICE.requestConsent(ctx, {
      networkId: this.network.id!,
      accountId: this.wallet.id!,
      type: ConsentType.TRANSACTION,
      origin: this.origin,
      payload: txRequest
    })
  }

  async legacySignMessage([params]: Array<any>) {}

  async signMessage([params]: Array<any>) {}

  async signTypedData([params]: Array<any>) {}

  async getAccounts() {
    return this.wallet ? [this.wallet.address] : []
  }

  // https://eips.ethereum.org/EIPS/eip-1102
  async requestAccounts(ctx: Context) {
    await this.requestPermissions(ctx, [{ eth_accounts: {} }])
    return [this.wallet!.address]
  }

  // https://eips.ethereum.org/EIPS/eip-2255
  async getPermissions() {
    if (!this.wallet) {
      return []
    }
    return [
      {
        invoker: this.origin,
        parentCapability: 'eth_accounts',
        caveats: [
          {
            type: 'filterResponse',
            value: [this.wallet.address]
          }
        ]
      }
    ]
  }

  // https://eips.ethereum.org/EIPS/eip-2255
  async requestPermissions(
    ctx: Context,
    [{ eth_accounts, ...restPermissions }]: Array<any>
  ) {
    if (!eth_accounts || Object.keys(restPermissions).length) {
      // now only support `eth_accounts`
      throw ethErrors.rpc.invalidParams()
    }
    if (!this.wallet) {
      await CONSENT_SERVICE.requestConsent(ctx, {
        networkId: this.network.id!,
        accountId: [],
        type: ConsentType.REQUEST_PERMISSION,
        origin: this.origin,
        payload: {
          permissions: [{ permission: Permission.ACCOUNT }]
        } as RequestPermissionPayload
      })

      await this.getWallet()
    }
    return this.getPermissions()
  }

  // https://eips.ethereum.org/EIPS/eip-3085
  async addEthereumChain([params]: Array<AddEthereumChainParameter>) {
    const chainId = this.checkChainId(params.chainId)

    let rpcUrls, explorerUrls
    try {
      rpcUrls = params.rpcUrls.map((url) => new URL(url).toString())

      explorerUrls = (params.blockExplorerUrls ?? []).map((url) => {
        url = new URL(url).toString()
        return { name: '', url, standard: 'none' } as EvmExplorer
      })
    } catch (e: any) {
      throw ethErrors.rpc.invalidParams(e.toString())
    }

    if (!rpcUrls.length) {
      throw ethErrors.rpc.invalidParams('Missing rpcUrls')
    }

    if (!params.chainName?.length) {
      throw ethErrors.rpc.invalidParams('Invalid chainName')
    }

    const { name, symbol, decimals } = params.nativeCurrency
    if (!name?.length || !symbol?.length || typeof decimals !== 'number') {
      throw ethErrors.rpc.invalidParams('Invalid nativeCurrency')
    }

    const existing = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId
    })
    if (existing) {
      throw ethErrors.rpc.invalidRequest(
        'Chain with the specified chainId has existed'
      )
    }

    const info = {
      name: params.chainName,
      shortName: params.nativeCurrency?.symbol.toLowerCase(),
      chain: params.nativeCurrency?.symbol,
      chainId,
      networkId: chainId,
      rpc: rpcUrls,
      explorers: explorerUrls,
      infoURL: '',
      nativeCurrency: params.nativeCurrency
    } as EvmChainInfo

    if (
      chainId !==
      (await new EvmProvider({ chainId, info } as INetwork).getNetwork())
        .chainId
    ) {
      throw ethErrors.rpc.invalidParams('Mismatched chainId')
    }

    await NETWORK_SERVICE.addNetwork(NetworkKind.EVM, chainId, info)

    return null
  }

  // https://eips.ethereum.org/EIPS/eip-3326
  async switchEthereumChain([params]: Array<SwitchEthereumChainParameter>) {
    const chainId = this.checkChainId(params.chainId)
    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId
    })
    if (!network) {
      throw ethErrors.rpc.invalidRequest(
        'Chain with the specified chainId is not found'
      )
    }

    await setActiveNetwork(network.id!)

    return null
  }

  // https://eips.ethereum.org/EIPS/eip-747
  async watchAsset([params]: Array<any>) {
    // TODO

    return true
  }

  private checkChainId(chainId: string) {
    const chainIdNumber = +chainId
    if (
      isNaN(chainIdNumber) ||
      !ethers.utils.isHexString(chainId) ||
      ethers.utils.hexStripZeros(chainId) !== chainId
    ) {
      throw ethErrors.rpc.invalidParams('Invalid chainId')
    }
    return chainIdNumber
  }
}

interface AddEthereumChainParameter {
  chainId: string
  blockExplorerUrls?: string[]
  chainName: string
  iconUrls?: string[]
  nativeCurrency: NativeCurrency
  rpcUrls: string[]
}

interface SwitchEthereumChainParameter {
  chainId: string
}

interface WatchAssetParameters {
  type: string // The asset's interface, e.g. 'ERC20'
  options: {
    address: string // The hexadecimal Ethereum address of the token contract
    symbol?: string // A ticker symbol or shorthand, up to 5 alphanumerical characters
    decimals?: number // The number of asset decimals
    image?: string // A string url of the token logo
  }
}
