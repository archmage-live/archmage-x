import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'
import { ethers } from 'ethers'

import { getActiveNetworkByKind, setActiveNetwork } from '~lib/active'
import { NetworkKind } from '~lib/network'
import { EvmChainInfo, EvmExplorer, NativeCurrency } from '~lib/network/evm'
import { Context } from '~lib/rpc'
import { IChainAccount, INetwork } from '~lib/schema'
import { getConnectedAccountsBySite } from '~lib/services/connectedSiteService'
import {
  AddNetworkPayload,
  CONSENT_SERVICE,
  ConsentRequest,
  ConsentType,
  Permission,
  RequestPermissionPayload
} from '~lib/services/consentService'
import { NETWORK_SERVICE } from '~lib/services/network'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { getEvmChainId } from '~pages/Settings/SettingsNetworks/NetworkAdd/EvmNetworkAdd'

import { EvmProvider, EvmProviderAdaptor } from '.'

export class EvmPermissionedProvider {
  account?: IChainAccount

  private constructor(
    public network: INetwork,
    public provider: EvmProvider,
    public origin: string
  ) {
    assert(network.kind === NetworkKind.EVM)
  }

  static async fromMayThrow(fromUrl: string): Promise<EvmPermissionedProvider> {
    const provider = await EvmPermissionedProvider.from(fromUrl)
    if (!provider) {
      // no active network
      throw ethErrors.provider.disconnected()
    }
    return provider
  }

  static async from(
    fromUrl: string
  ): Promise<EvmPermissionedProvider | undefined> {
    const network = await getActiveNetworkByKind(NetworkKind.EVM)
    if (!network) {
      return
    }

    const provider = await EvmProvider.from(network)
    const permissionedProvider = new EvmPermissionedProvider(
      network,
      provider,
      new URL(fromUrl).origin
    )

    if (await PASSWORD_SERVICE.isUnlocked()) {
      await permissionedProvider.getWallet()
    }

    return permissionedProvider
  }

  private async getWallet() {
    const accounts = await this.getConnectedAccounts()
    if (accounts.length) {
      this.account = accounts[0]
    }
  }

  async getConnectedAccounts() {
    return getConnectedAccountsBySite(this.origin, this.network)
  }

  async send(ctx: Context, method: string, params: Array<any>): Promise<any> {
    try {
      switch (method) {
        case 'eth_accounts':
          return await this.getAccounts()
        case 'eth_requestAccounts':
          return await this.requestAccounts(ctx)
        case 'wallet_getPermissions':
          return await this.getPermissions()
        case 'wallet_requestPermissions':
          return await this.requestPermissions(ctx, params)
        case 'wallet_addEthereumChain':
          return await this.addEthereumChain(ctx, params)
        case 'wallet_switchEthereumChain':
          return await this.switchEthereumChain(ctx, params)
        case 'wallet_watchAsset':
          return await this.watchAsset(params)
        case 'eth_sendTransaction':
          return await this.sendTransaction(ctx, params)
        case 'eth_sign':
          return await this.legacySignMessage(params)
        case 'personal_sign':
          return await this.signMessage(params)
        case 'eth_signTypedData':
        // fallthrough
        case 'eth_signTypedData_v1':
        // fallthrough
        case 'eth_signTypedData_v3':
          throw ethErrors.provider.unsupportedMethod(
            'Please use eth_signTypedData_v4 instead.'
          )
        case 'eth_signTypedData_v4':
          return await this.signTypedData(params)
      }

      // always allow readonly calls to provider, regardless of whether locked
      return await this.provider.send(method, params)
    } catch (err: any) {
      console.error(err)
      // pick out ethers error
      // TODO: is this enough?
      if ('code' in err && 'reason' in err) {
        let message = err.reason
        if (err.reason?.includes('processing response error')) {
          const { body } = err
          message = body
        }
        const err2: any = new Error(message)
        err2.code = err.code
        throw err2
      } else {
        throw err
      }
    }
  }

  async sendTransaction(ctx: Context, [params]: Array<any>) {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    const provider = new EvmProviderAdaptor(this.provider)
    const txPayload = await provider.populateTransaction(this.account, params)

    return CONSENT_SERVICE.requestConsent(ctx, {
      networkId: this.network.id,
      accountId: this.account.id,
      type: ConsentType.TRANSACTION,
      origin: this.origin,
      payload: txPayload
    })
  }

  async legacySignMessage([params]: Array<any>) {
    // TODO: consent
  }

  async signMessage([params]: Array<any>) {
    // TODO: consent
  }

  async signTypedData([params]: Array<any>) {
    // TODO: consent
  }

  getAccounts() {
    return this.account?.address ? [this.account.address] : []
  }

  // https://eips.ethereum.org/EIPS/eip-1102
  async requestAccounts(ctx: Context) {
    if (await PASSWORD_SERVICE.isLocked()) {
      await CONSENT_SERVICE.requestConsent(ctx, {
        networkId: undefined,
        accountId: undefined,
        type: ConsentType.UNLOCK,
        origin: this.origin,
        payload: {}
      } as any as ConsentRequest)
    }

    await this.getWallet()

    if (!this.getAccounts().length) {
      await this.requestPermissions(ctx, [{ eth_accounts: {} }])
    }

    return this.getAccounts()
  }

  // https://eips.ethereum.org/EIPS/eip-2255
  async getPermissions() {
    let addresses: string[] = []
    if (await PASSWORD_SERVICE.isUnlocked()) {
      addresses = (await this.getConnectedAccounts()).map((acc) => acc.address!)
    }

    return [
      {
        invoker: this.origin,
        parentCapability: 'eth_accounts',
        caveats: [
          {
            type: 'filterResponse',
            value: addresses
          },
          {
            type: 'restrictReturnedAccounts', // MetaMask
            value: addresses
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

    return this.getPermissions()
  }

  // https://eips.ethereum.org/EIPS/eip-3085
  async addEthereumChain(
    ctx: Context,
    [params]: Array<AddEthereumChainParameter>
  ) {
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
    if (
      !name?.length ||
      !symbol?.length ||
      typeof decimals !== 'number' ||
      decimals <= 0
    ) {
      throw ethErrors.rpc.invalidParams('Invalid nativeCurrency')
    }

    const existing = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId
    })
    if (existing) {
      throw ethErrors.rpc.invalidRequest(
        'Chain with the specified chainId already exists'
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

    if (chainId !== (await getEvmChainId(rpcUrls[0]))) {
      throw ethErrors.rpc.invalidParams('Mismatched chainId')
    }

    await CONSENT_SERVICE.requestConsent(ctx, {
      networkId: undefined,
      accountId: undefined,
      type: ConsentType.ADD_NETWORK,
      origin: this.origin,
      payload: {
        networkKind: NetworkKind.EVM,
        chainId,
        info
      } as AddNetworkPayload
    } as any as ConsentRequest)

    return null
  }

  // https://eips.ethereum.org/EIPS/eip-3326
  async switchEthereumChain(
    ctx: Context,
    [params]: Array<SwitchEthereumChainParameter>
  ) {
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

    // TODO: consent

    await setActiveNetwork(network.id!)

    return null
  }

  // https://eips.ethereum.org/EIPS/eip-747
  async watchAsset([params]: Array<any>) {
    // TODO: consent

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
