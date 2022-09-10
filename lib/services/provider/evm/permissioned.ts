import { VoidSigner } from '@ethersproject/abstract-signer'
import { BigNumberish } from '@ethersproject/bignumber'
import { BytesLike } from '@ethersproject/bytes'
import { Logger } from '@ethersproject/logger'
import { shallowCopy } from '@ethersproject/properties'
import { version } from '@ethersproject/providers/lib/_version'
import { AccessListish } from '@ethersproject/transactions'
import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'
import { ethers } from 'ethers'

import {
  getActive,
  getActiveNetworkByKind,
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
  RequestPermissionPayload,
  TransactionPayload
} from '~lib/services/consentService'
import { NETWORK_SERVICE } from '~lib/services/network'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { WALLET_SERVICE } from '~lib/services/walletService'

import { EvmProvider } from '.'

const logger = new Logger(version)

export type EvmTransactionParams = {
  to?: string
  from?: string
  nonce?: BigNumberish // ignored

  gas?: BigNumberish // gas limit
  gasLimit?: BigNumberish // gas limit
  gasPrice?: BigNumberish

  data?: BytesLike
  value?: BigNumberish
  chainId?: number

  type?: number
  accessList?: AccessListish

  maxPriorityFeePerGas?: BigNumberish
  maxFeePerGas?: BigNumberish
}

export type EvmPopulatedParams = {
  gasPrice?: BigNumberish
  maxPriorityFeePerGas?: BigNumberish
  maxFeePerGas?: BigNumberish
  code?: string
}

export const allowedTransactionKeys: Array<string> = [
  'accessList',
  'chainId',
  'data',
  'from',
  'gas',
  'gasLimit',
  'gasPrice',
  'maxFeePerGas',
  'maxPriorityFeePerGas',
  'nonce',
  'to',
  'type',
  'value'
]

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
    // get connections by site
    const connections = await CONNECTED_SITE_SERVICE.getConnectedSitesBySite(
      this.origin
    )
    if (!connections.length) {
      return []
    }

    // get connected accounts
    let accounts = await WALLET_SERVICE.getChainAccounts(
      connections.map((conn) => {
        return {
          masterId: conn.masterId,
          index: conn.index,
          networkKind: NetworkKind.EVM,
          chainId: this.network.chainId
        }
      })
    )

    // filter accounts with valid address
    accounts = accounts.filter((account) => !!account.address)
    if (!accounts.length) {
      return accounts
    }

    let index = -1
    const { account: activeAccount } = await getActive()
    if (activeAccount?.networkKind === NetworkKind.EVM) {
      // prefer active account
      index = accounts.findIndex((account) => account.id === activeAccount.id)
    }
    if (index < 0) {
      // fallback to last account
      // TODO: select recently visited
      index = accounts.length - 1
    }

    // put active account at the front of the array
    const [active] = accounts.splice(index, 1)
    accounts.unshift(active)

    return accounts
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
          return await this.addEthereumChain(params)
        case 'wallet_switchEthereumChain':
          return await this.switchEthereumChain(params)
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
        const err2: any = new Error(err.reason)
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

    const voidSigner = new VoidSigner(this.account.address, this.provider)

    const [txParams, populatedParams] = await this.populateTransaction(
      voidSigner,
      params
    )

    return CONSENT_SERVICE.requestConsent(ctx, {
      networkId: this.network.id,
      accountId: this.account.id,
      type: ConsentType.TRANSACTION,
      origin: this.origin,
      payload: {
        txParams,
        populatedParams
      } as TransactionPayload
    })
  }

  private async populateTransaction(
    signer: VoidSigner,
    transaction: EvmTransactionParams
  ): Promise<[EvmTransactionParams, EvmPopulatedParams]> {
    for (const key in transaction) {
      if (allowedTransactionKeys.indexOf(key) === -1) {
        logger.throwArgumentError(
          'invalid transaction key: ' + key,
          'transaction',
          transaction
        )
      }
    }

    const tx = shallowCopy(transaction)

    const from = await signer.getAddress()
    if (!tx.from) {
      tx.from = from
    } else {
      // Make sure any provided address matches this signer
      if (tx.from.toLowerCase() !== from.toLowerCase()) {
        logger.throwArgumentError(
          'from address mismatch',
          'transaction',
          transaction
        )
      }
    }

    if (tx.to) {
      const to = await signer.resolveName(tx.to)
      if (!to) {
        logger.throwArgumentError(
          'provided ENS name resolves to null',
          'tx.to',
          to
        )
      }
      tx.to = to
    }

    // Do not allow mixing pre-eip-1559 and eip-1559 properties
    const hasEip1559 =
      tx.maxFeePerGas != null || tx.maxPriorityFeePerGas != null
    if (tx.gasPrice != null && (tx.type === 2 || hasEip1559)) {
      logger.throwArgumentError(
        'eip-1559 transaction do not support gasPrice',
        'transaction',
        transaction
      )
    } else if ((tx.type === 0 || tx.type === 1) && hasEip1559) {
      logger.throwArgumentError(
        'pre-eip-1559 transaction do not support maxFeePerGas/maxPriorityFeePerGas',
        'transaction',
        transaction
      )
    }

    const populatedParams: EvmPopulatedParams = {}

    if (
      (tx.type === 2 || tx.type == null) &&
      tx.maxFeePerGas != null &&
      tx.maxPriorityFeePerGas != null
    ) {
      // Fully-formed EIP-1559 transaction (skip getFeeData)
      tx.type = 2
    } else if (tx.type === 0 || tx.type === 1) {
      // Explicit Legacy or EIP-2930 transaction

      // Populate missing gasPrice
      if (tx.gasPrice == null) {
        populatedParams.gasPrice = await signer.getGasPrice()
      }
    } else {
      // We need to get fee data to determine things
      const feeData = await signer.getFeeData()

      if (tx.type == null) {
        // We need to auto-detect the intended type of this transaction...

        if (
          feeData.maxFeePerGas != null &&
          feeData.maxPriorityFeePerGas != null
        ) {
          // The network supports EIP-1559!

          // Upgrade transaction from null to eip-1559
          tx.type = 2

          if (tx.gasPrice != null) {
            // Using legacy gasPrice property on an eip-1559 network,
            // so use gasPrice as both fee properties
            const gasPrice = tx.gasPrice
            delete tx.gasPrice
            tx.maxFeePerGas = gasPrice
            tx.maxPriorityFeePerGas = gasPrice
          } else {
            // Populate missing fee data
            if (tx.maxFeePerGas == null) {
              populatedParams.maxFeePerGas = feeData.maxFeePerGas
            }
            if (tx.maxPriorityFeePerGas == null) {
              populatedParams.maxPriorityFeePerGas =
                feeData.maxPriorityFeePerGas
            }
          }
        } else if (feeData.gasPrice != null) {
          // Network doesn't support EIP-1559...

          // ...but they are trying to use EIP-1559 properties
          if (hasEip1559) {
            logger.throwError(
              'network does not support EIP-1559',
              Logger.errors.UNSUPPORTED_OPERATION,
              {
                operation: 'populateTransaction'
              }
            )
          }

          // Populate missing fee data
          if (tx.gasPrice == null) {
            tx.gasPrice = populatedParams.gasPrice
          }

          // Explicitly set untyped transaction to legacy
          tx.type = 0
        } else {
          // getFeeData has failed us.
          logger.throwError(
            'failed to get consistent fee data',
            Logger.errors.UNSUPPORTED_OPERATION,
            {
              operation: 'signer.getFeeData'
            }
          )
        }
      } else if (tx.type === 2) {
        // Explicitly using EIP-1559

        // Populate missing fee data
        if (tx.maxFeePerGas == null) {
          populatedParams.maxFeePerGas = feeData.maxFeePerGas || undefined
        }
        if (tx.maxPriorityFeePerGas == null) {
          populatedParams.maxPriorityFeePerGas =
            feeData.maxPriorityFeePerGas || undefined
        }
      }
    }

    // TODO: nonce manager
    tx.nonce = await signer.getTransactionCount('pending')

    if (tx.gas != null) {
      if (tx.gasLimit != null) {
        logger.throwArgumentError(
          'gas and gasLimit cannot be both specified',
          'transaction',
          transaction
        )
      }
      tx.gasLimit = tx.gas
      delete tx.gas
    }

    if (tx.gasLimit == null) {
      try {
        tx.gasLimit = await signer.estimateGas(tx).catch((error) => {
          if (forwardErrors.indexOf(error.code) >= 0) {
            throw error
          }

          return logger.throwError(
            'cannot estimate gas; transaction may fail or may require manual gas limit',
            Logger.errors.UNPREDICTABLE_GAS_LIMIT,
            {
              error: error,
              tx: tx
            }
          )
        })
      } catch (error: any) {
        if (error.code === Logger.errors.INSUFFICIENT_FUNDS) {
          populatedParams.code = error.code
        }
      }
    }

    const chainId = +this.network.chainId
    if (tx.chainId == null) {
      tx.chainId = chainId
    } else {
      if (tx.chainId !== chainId) {
        logger.throwArgumentError(
          'chainId mismatch',
          'transaction',
          transaction
        )
      }
    }

    return [tx, populatedParams]
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

  async getAccounts() {
    return this.account?.address ? [this.account.address] : []
  }

  // https://eips.ethereum.org/EIPS/eip-1102
  async requestAccounts(ctx: Context) {
    await this.requestPermissions(ctx, [{ eth_accounts: {} }])
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

    // TODO: requested overwrite old connected
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
      (
        await (
          await EvmProvider.from({ chainId, info } as INetwork)
        ).getNetwork()
      ).chainId
    ) {
      throw ethErrors.rpc.invalidParams('Mismatched chainId')
    }

    // TODO: consent

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

const forwardErrors = [
  Logger.errors.INSUFFICIENT_FUNDS,
  Logger.errors.NONCE_EXPIRED,
  Logger.errors.REPLACEMENT_UNDERPRICED
]
