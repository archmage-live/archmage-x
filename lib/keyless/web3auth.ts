import { LOGIN_PROVIDER, LOGIN_PROVIDER_TYPE } from '@toruslabs/openlogin-utils'
import {
  CHAIN_NAMESPACES,
  CustomChainConfig,
  UserInfo,
  WALLET_ADAPTERS
} from '@web3auth/base'
import { CommonPrivateKeyProvider } from '@web3auth/base-provider'
import type { Web3AuthNoModalOptions } from '@web3auth/no-modal'
import { Web3AuthNoModal } from '@web3auth/no-modal'
import { OpenloginAdapter } from '@web3auth/openlogin-adapter'
import type { OpenloginAdapterOptions } from '@web3auth/openlogin-adapter'
import assert from 'assert'
import {
  HDNodeWallet,
  KeystoreAccount,
  Mnemonic,
  Wallet,
  getBytes,
  hexlify
} from 'ethers'

import { ISubWallet, IWallet } from '~lib/schema'
import { SECURE_SESSION_STORE, SESSION_STORE, StoreKey } from '~lib/store'
import { WalletType, extractWalletHash } from '~archmage/wallet'

export const WEB3AUTH_LOGIN_PROVIDER = LOGIN_PROVIDER
export type WEB3AUTH_LOGIN_PROVIDER_TYPE = LOGIN_PROVIDER_TYPE

export function web3AuthInitOptions(): [
  Web3AuthNoModalOptions,
  OpenloginAdapterOptions
] {
  assert(process.env.PLASMO_PUBLIC_WEB3AUTH_CYAN_MAINNET_CLIENT_ID)

  return [
    {
      clientId: process.env.PLASMO_PUBLIC_WEB3AUTH_CYAN_MAINNET_CLIENT_ID,
      chainConfig: {
        chainNamespace: CHAIN_NAMESPACES.OTHER,
        chainId: '0x1',
        rpcTarget: 'https://rpc.ankr.com/eth',
        displayName: 'Ethereum',
        ticker: 'ETH',
        tickerName: 'ether'
      },
      enableLogging: false,
      storageKey: 'local',
      sessionTime: 86400 * 7, // 7 days
      web3AuthNetwork: 'cyan',
      useCoreKitKey: false
    } as Web3AuthNoModalOptions,
    {
      adapterSettings: {
        network: 'cyan',
        uxMode: 'popup',
        whiteLabel: {
          name: 'Archmage',
          logoLight:
            'https://github.com/archmage-live/archmage-x/raw/main/assets/archmage.svg',
          logoDark:
            'https://github.com/archmage-live/archmage-x/raw/main/assets/archmage.svg',
          defaultLanguage: 'en',
          dark: true
        },
        redirectUrl: globalThis.location.origin // not used
      },
      loginSettings: {
        mfaLevel: 'optional'
      }
    } as OpenloginAdapterOptions
  ]
}

export class Web3auth {
  protected userInfo?: Partial<UserInfo>
  protected privateKey?: string

  protected constructor(public web3auth: Web3AuthNoModal) {}

  static async create() {
    const [web3authOptions, openloginOptions] = web3AuthInitOptions()

    const web3auth = new Web3AuthNoModal(web3authOptions)

    const openloginAdapter = new OpenloginAdapter(openloginOptions)

    web3auth.configureAdapter(openloginAdapter)

    openloginAdapter.setAdapterSettings({
      privateKeyProvider: new CommonPrivateKeyProvider({
        config: {
          chainConfig: openloginAdapter.chainConfigProxy as CustomChainConfig
        }
      })
    })

    await web3auth.init()

    return new Web3auth(web3auth)
  }

  private async connectTo(
    loginProvider: LOGIN_PROVIDER_TYPE,
    reconnect: boolean = false
  ): Promise<boolean | undefined> {
    const web3auth = this.web3auth

    if (web3auth.connected && reconnect) {
      // since it is connected, we disconnect it for reconnecting
      await this.disconnect()

      // for reconnecting
      return undefined
    }

    if (!web3auth.connected) {
      // connect
      const provider = await web3auth.connectTo(WALLET_ADAPTERS.OPENLOGIN, {
        loginProvider
      })
      if (!provider) {
        return false
      }
    }

    return true
  }

  get connected() {
    return this.web3auth.connected
  }

  async disconnect() {
    const web3auth = this.web3auth
    if (web3auth.connected) {
      await web3auth.logout({ cleanup: true })
      web3auth.clearCache()
    }
  }

  static async connect({
    loginProvider,
    reconnect = false
  }: {
    loginProvider: LOGIN_PROVIDER_TYPE
    reconnect?: boolean
  }): Promise<Web3auth | undefined> {
    try {
      const wa = await Web3auth.create()
      const connected = await wa.connectTo(loginProvider, reconnect)
      if (connected === undefined) {
        // reconnect
        return await Web3auth.connect({ loginProvider })
      } else if (!connected) {
        // failed
        return undefined
      }

      return wa
    } catch (err) {
      console.error(err)
      return undefined
    }
  }

  async getUserInfo(): Promise<Partial<UserInfo> | undefined> {
    if (!this.userInfo) {
      if (!this.connected) {
        return
      }
      this.userInfo = await this.web3auth.getUserInfo()
    }
    return this.userInfo
  }

  async getInfo(): Promise<
    | {
        loginProvider: string
        name: string
        imageUrl?: string
      }
    | undefined
  > {
    const userInfo = await this.getUserInfo()
    if (!userInfo) {
      return
    }
    // console.log(userInfo)

    const info = {
      loginProvider: userInfo.typeOfLogin as string,
      name: userInfo.name as string,
      imageUrl: userInfo.profileImage
    }

    switch (userInfo.typeOfLogin) {
      case WEB3AUTH_LOGIN_PROVIDER.JWT:
        if (userInfo.aggregateVerifier?.includes('email-passwordless')) {
          info.loginProvider = WEB3AUTH_LOGIN_PROVIDER.EMAIL_PASSWORDLESS
        } else if (userInfo.aggregateVerifier?.includes('sms-passwordless')) {
          info.loginProvider = WEB3AUTH_LOGIN_PROVIDER.SMS_PASSWORDLESS
        } else if (userInfo.aggregateVerifier?.includes('wechat')) {
          info.loginProvider = WEB3AUTH_LOGIN_PROVIDER.WECHAT
        }
        break
    }

    return info
  }

  async getPrivateKey() {
    if (!this.privateKey) {
      if (!this.connected) {
        return
      }
      const privateKey = await this.web3auth.provider?.request<string>({
        method: 'private_key'
      })
      if (!privateKey) {
        return
      }
      // cache
      this.privateKey = hexlify(getBytes(privateKey))
    }

    return this.privateKey
  }

  async getMnemonic() {
    const privateKey = await this.getPrivateKey()
    if (!privateKey) {
      return
    }

    return Mnemonic.fromEntropy(privateKey).phrase
  }

  async getUniqueHash() {
    const privateKey = await this.getPrivateKey()
    if (!privateKey) {
      return
    }

    return new Wallet(privateKey).address
  }

  async cacheKeystore() {
    const privateKey = await this.getPrivateKey()
    const hash = await this.getUniqueHash()
    if (!privateKey || !hash) {
      return false
    }

    const key = keylessKey(hash)

    await SECURE_SESSION_STORE.set(key, privateKey)

    return true
  }

  async getKeystore(
    wallet: IWallet,
    subWallet?: ISubWallet
  ): Promise<KeystoreAccount | undefined> {
    let storedHash
    switch (wallet.type) {
      case WalletType.KEYLESS_HD:
      // pass through
      case WalletType.KEYLESS:
        storedHash = wallet.hash
        break
      case WalletType.KEYLESS_GROUP:
        storedHash = subWallet?.hash!
        break
      default:
        return
    }

    storedHash = extractWalletHash(storedHash)
    if (!storedHash) {
      return
    }

    const key = keylessKey(storedHash)
    let privateKey: string | undefined = await SESSION_STORE.get(key)

    if (!privateKey) {
      // check hash consistency
      const hash = await this.getUniqueHash()
      if (!hash) {
        return
      }

      if (hash !== storedHash) {
        return
      }

      await this.cacheKeystore()

      privateKey = await this.getPrivateKey()
    }

    if (!privateKey) {
      return
    }

    let acc
    switch (wallet.type) {
      case WalletType.KEYLESS_HD: {
        const mnemonic = Mnemonic.fromEntropy(privateKey)
        acc = HDNodeWallet.fromMnemonic(mnemonic)
        break
      }
      case WalletType.KEYLESS:
      // pass through
      case WalletType.KEYLESS_GROUP: {
        acc = new Wallet(privateKey)
        break
      }
      default:
        return
    }

    return {
      address: acc.address,
      privateKey: acc.privateKey,
      mnemonic:
        acc instanceof HDNodeWallet
          ? {
              path: acc.path,
              locale: acc.mnemonic!.wordlist.locale,
              entropy: acc.mnemonic!.entropy
            }
          : undefined
    } as KeystoreAccount
  }
}

function keylessKey(hash: string): string {
  return `${StoreKey.KEYLESS_PREFIX}_web3auth_${hash}`
}
