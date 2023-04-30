import { OpenloginUserInfo } from '@toruslabs/openlogin'
import { CHAIN_NAMESPACES } from '@web3auth/base'
import { Web3Auth } from '@web3auth/modal'
import { OpenloginAdapter } from '@web3auth/openlogin-adapter'

export class Web3AuthMpc {
  private userInfo?: Partial<OpenloginUserInfo>
  private privateKey?: string

  private constructor(public web3auth: Web3Auth) {}

  static async connect() {
    const web3auth = new Web3Auth({
      clientId:
        'BHjK8lYI0-Nx_8rY3g3HON99BvESPdv5n7XCVRj5urrOeg-eFXhr5lX0IhQq6lP5BBDArKr3NLSyRteTFPM2ixE',
      chainConfig: {
        chainNamespace: CHAIN_NAMESPACES.OTHER,
        displayName: 'Ethereum',
        ticker: 'ETH',
        tickerName: 'ether'
      },
      storageKey: 'local',
      sessionTime: 86400 * 7, // 7 days
      authMode: 'WALLET',
      uiConfig: {
        appName: 'Archmage',
        appLogo:
          'https://github.com/archmage-live/archmage-x/raw/main/assets/archmage.svg',
        theme: 'dark',
        loginMethodsOrder: [
          'google',
          'twitter',
          'discord',
          'github',
          'facebook'
        ],
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

    const provider = await web3auth.connect()
    if (!provider) {
      return
    }

    return new Web3AuthMpc(web3auth)
  }

  async getUserInfo(): Promise<Partial<OpenloginUserInfo>> {
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
}
