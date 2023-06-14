import { entropyToMnemonic } from '@ethersproject/hdnode/src.ts'
import { CHAIN_NAMESPACES, UserInfo } from '@web3auth/base'
import { Web3Auth } from '@web3auth/modal'
import { OpenloginAdapter } from '@web3auth/openlogin-adapter'
import assert from 'assert'

export class Web3AuthMpc {
  private userInfo?: Partial<UserInfo>
  private privateKey?: string

  private constructor(public web3auth: Web3Auth) {}

  static async connect({
    theme,
    reconnect = false
  }: {
    reconnect: boolean
    theme: 'light' | 'dark'
  }) {
    assert(process.env.PLASMO_PUBLIC_WEB3AUTH_SAPPHIRE_MAINNET_CLIENT_ID)

    const web3auth = new Web3Auth({
      clientId: process.env.PLASMO_PUBLIC_WEB3AUTH_SAPPHIRE_MAINNET_CLIENT_ID,
      chainConfig: {
        chainNamespace: CHAIN_NAMESPACES.OTHER,
        displayName: 'Ethereum',
        ticker: 'ETH',
        tickerName: 'ether'
      },
      enableLogging: true,
      storageKey: 'local',
      sessionTime: 86400 * 7, // 7 days
      web3AuthNetwork: 'cyan',
      useCoreKitKey: true,
      authMode: 'WALLET',
      uiConfig: {
        appName: 'Archmage',
        appLogo:
          'https://github.com/archmage-live/archmage-x/raw/main/assets/archmage.svg',
        theme,
        loginMethodsOrder: [
          'google',
          'twitter',
          'discord',
          'github',
          'facebook'
        ],
        defaultLanguage: 'en',
        modalZIndex: '99999',
        displayErrorsOnModal: true,
        primaryButton: 'socialLogin'
      }
    })

    const openloginAdapter = new OpenloginAdapter({
      adapterSettings: {
        network: 'cyan',
        uxMode: 'popup',
        whiteLabel: {
          name: 'Archmage',
          logoLight:
            'https://github.com/archmage-live/archmage-x/raw/main/assets/archmage.svg',
          logoDark:
            'https://github.com/archmage-live/archmage-x/raw/main/assets/archmage.svg',
          dark: true
        }
      },
      loginSettings: {
        mfaLevel: 'optional'
      }
    })
    web3auth.configureAdapter(openloginAdapter)

    await web3auth.initModal()

    if (!web3auth.provider || reconnect) {
      const provider = await web3auth.connect()
      if (!provider) {
        return undefined
      }
    }

    return new Web3AuthMpc(web3auth)
  }

  async getUserInfo(): Promise<Partial<UserInfo>> {
    if (this.userInfo) {
      return this.userInfo
    }
    const userInfo = await this.web3auth.getUserInfo()
    this.userInfo = userInfo // cache
    return userInfo
  }

  async getPrivateKey() {
    if (this.privateKey) {
      return this.privateKey
    }

    const privateKey = await this.web3auth.provider?.request<string>({
      method: 'private_key'
    })
    if (!privateKey) {
      return
    }
    this.privateKey = privateKey // cache
    return privateKey
  }

  async getMnemonic() {
    const privateKey = await this.getPrivateKey()
    if (!privateKey) {
      return
    }

    return entropyToMnemonic(privateKey)
  }
}
