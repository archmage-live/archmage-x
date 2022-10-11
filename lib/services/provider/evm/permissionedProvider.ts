import { arrayify, hexlify } from '@ethersproject/bytes'
import { TokenInfo } from '@uniswap/token-lists'
import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'
import { ethers } from 'ethers'

import { getActiveNetwork, getActiveNetworkByKind } from '~lib/active'
import { NetworkKind } from '~lib/network'
import { EvmChainInfo, EvmExplorer, NativeCurrency } from '~lib/network/evm'
import { ERC20__factory } from '~lib/network/evm/abi'
import { Context } from '~lib/rpc'
import { IChainAccount, INetwork, TokenVisibility } from '~lib/schema'
import { getConnectedAccountsBySite } from '~lib/services/connectedSiteService'
import {
  AddNetworkPayload,
  CONSENT_SERVICE,
  ConsentRequest,
  ConsentType,
  Permission,
  RequestPermissionPayload,
  SignMsgPayload,
  SignTypedDataPayload,
  WatchAssetPayload
} from '~lib/services/consentService'
import { NETWORK_SERVICE } from '~lib/services/network'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { TOKEN_SERVICE } from '~lib/services/token'
import { checkAddress } from '~lib/wallet'
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
          return await this.watchAsset(ctx, params as any)
        case 'eth_sendTransaction':
          return await this.sendTransaction(ctx, params)
        case 'eth_sign':
          return await this.legacySignMessage(ctx, params as any)
        case 'personal_sign':
          return await this.signMessage(ctx, params as any)
        case 'eth_signTypedData':
        // fallthrough
        case 'eth_signTypedData_v1':
        // fallthrough
        case 'eth_signTypedData_v3':
          throw ethErrors.provider.unsupportedMethod(
            'Please use eth_signTypedData_v4 instead.'
          )
        case 'eth_signTypedData_v4':
          return await this.signTypedData(ctx, params as any)
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

    return CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.TRANSACTION,
        origin: this.origin,
        payload: txPayload
      },
      ctx
    )
  }

  // https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sign
  // https://github.com/MetaMask/metamask-extension/issues/9957
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1395
  async legacySignMessage(ctx: Context, [from, message]: [string, string]) {
    // NOTE: we implement `eth_sign` according to the Ethereum standard,
    //       it is different from MetaMask's legacy insecure implementation
    return this.signMessage(ctx, [message, from])
  }

  async signMessage(ctx: Context, [message, from]: [string, string]) {
    if (
      !this.account?.address ||
      this.account.address !== checkAddress(NetworkKind.EVM, from)
    ) {
      throw ethErrors.provider.unauthorized()
    }

    message = hexlify(arrayify(message))

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.SIGN_MSG,
        origin: this.origin,
        payload: {
          message
        } as SignMsgPayload
      } as any as ConsentRequest,
      ctx
    )
  }

  async signTypedData(ctx: Context, [from, typedData]: [string, any]) {
    if (
      !this.account?.address ||
      this.account.address !== checkAddress(NetworkKind.EVM, from)
    ) {
      throw ethErrors.provider.unauthorized()
    }

    const provider = new EvmProviderAdaptor(this.provider)
    typedData = await provider.getTypedData(JSON.parse(typedData))

    const { chainId, name, version, verifyingContract } = typedData.domain

    if (!chainId || +chainId !== this.network.chainId) {
      throw ethErrors.rpc.invalidParams('Mismatched chainId')
    }

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.SIGN_TYPED_DATA,
        origin: this.origin,
        payload: {
          metadata: [
            ['Name', name],
            ['Version', version],
            ['Contract', verifyingContract]
          ],
          typedData
        } as SignTypedDataPayload
      } as any as ConsentRequest,
      ctx
    )
  }

  getAccounts() {
    return this.account?.address ? [this.account.address] : []
  }

  // https://eips.ethereum.org/EIPS/eip-1102
  async requestAccounts(ctx: Context) {
    if (await PASSWORD_SERVICE.isLocked()) {
      await CONSENT_SERVICE.requestConsent(
        {
          networkId: undefined,
          accountId: undefined,
          type: ConsentType.UNLOCK,
          origin: this.origin,
          payload: {}
        } as any as ConsentRequest,
        ctx
      )
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

    await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id!,
        accountId: [],
        type: ConsentType.REQUEST_PERMISSION,
        origin: this.origin,
        payload: {
          permissions: [{ permission: Permission.ACCOUNT }]
        } as RequestPermissionPayload
      },
      ctx
    )

    await this.getWallet()

    return this.getPermissions()
  }

  // https://eips.ethereum.org/EIPS/eip-3085
  async addEthereumChain(
    ctx: Context,
    [params]: Array<AddEthereumChainParameter>
  ) {
    const chainId = this.checkChainId(params.chainId)

    const existing = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId
    })
    if (existing) {
      const activeNetwork = await getActiveNetwork()
      if (
        activeNetwork?.kind === NetworkKind.EVM &&
        existing.chainId === activeNetwork.chainId
      ) {
        return null
      }

      return this.switchEthereumChain(ctx, [
        { chainId: params.chainId } as SwitchEthereumChainParameter
      ])
    }

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

    await CONSENT_SERVICE.requestConsent(
      {
        networkId: undefined,
        accountId: undefined,
        type: ConsentType.ADD_NETWORK,
        origin: this.origin,
        payload: {
          networkKind: NetworkKind.EVM,
          chainId,
          info
        } as AddNetworkPayload
      } as any as ConsentRequest,
      ctx
    )

    return this.switchEthereumChain(ctx, [
      { chainId: params.chainId } as SwitchEthereumChainParameter
    ])
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

    await CONSENT_SERVICE.requestConsent(
      {
        networkId: network.id,
        accountId: undefined,
        type: ConsentType.SWITCH_NETWORK,
        origin: this.origin,
        payload: {}
      } as any as ConsentRequest,
      ctx
    )

    return null
  }

  // https://eips.ethereum.org/EIPS/eip-747
  async watchAsset(ctx: Context, params: WatchAssetParameters) {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    if (params.type !== 'ERC20') {
      throw ethErrors.rpc.invalidRequest(
        'Currently only ERC20 token is supported'
      )
    }

    const {
      address,
      symbol: symbolMayEmpty,
      decimals: decimalsMayEmpty,
      image
    } = params.options

    const token = ethers.utils.getAddress(address)
    const tokenContract = ERC20__factory.connect(token, this.provider)
    const name = await tokenContract.name()
    const symbol = await tokenContract.symbol()
    const decimals = await tokenContract.decimals()
    const balance = (
      await tokenContract.balanceOf(this.account.address)
    ).toString()

    if (symbolMayEmpty != null && symbolMayEmpty !== symbol) {
      throw ethErrors.rpc.invalidParams(
        'Symbol is different form on-chain symbol'
      )
    }
    if (decimalsMayEmpty != null && +decimalsMayEmpty !== decimals) {
      throw ethErrors.rpc.invalidParams(
        'Decimals is different form on-chain decimals'
      )
    }

    const existing = await TOKEN_SERVICE.getToken({
      account: this.account,
      token
    })
    if (existing && existing.visible === TokenVisibility.SHOW) {
      return true
    }

    const info = {
      chainId: this.network.chainId,
      address: token,
      name,
      decimals,
      symbol,
      logoURI: image
    } as TokenInfo

    await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.WATCH_ASSET,
        origin: this.origin,
        payload: { token, info, balance } as WatchAssetPayload
      } as any as ConsentRequest,
      ctx
    )

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
    decimals?: number | string // The number of asset decimals
    image?: string // A string url of the token logo
  }
}
