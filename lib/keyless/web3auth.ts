import { arrayify, hexlify } from '@ethersproject/bytes'
import { entropyToMnemonic } from '@ethersproject/hdnode/src.ts'
import { LOGIN_PROVIDER, LOGIN_PROVIDER_TYPE } from '@toruslabs/openlogin-utils'
import { CHAIN_NAMESPACES, UserInfo, WALLET_ADAPTERS } from '@web3auth/base'
import { Web3Auth as Web3AuthModal } from '@web3auth/modal'
import { OpenloginAdapter } from '@web3auth/openlogin-adapter'
import assert from 'assert'
import { ethers } from 'ethers'

export const WEB3AUTH_LOGIN_PROVIDER = LOGIN_PROVIDER
export type WEB3AUTH_LOGIN_PROVIDER_TYPE = LOGIN_PROVIDER_TYPE

export class Web3Auth {
  private userInfo?: Partial<UserInfo>
  private privateKey?: string

  private constructor(public web3auth: Web3AuthModal) {}

  static async connect({
    theme,
    reconnect = false,
    loginProvider
  }: {
    reconnect?: boolean
    theme: 'light' | 'dark'
    loginProvider?: LOGIN_PROVIDER_TYPE
  }): Promise<Web3Auth | undefined> {
    try {
      assert(process.env.PLASMO_PUBLIC_WEB3AUTH_CYAN_MAINNET_CLIENT_ID)

      const web3auth = new Web3AuthModal({
        clientId: process.env.PLASMO_PUBLIC_WEB3AUTH_CYAN_MAINNET_CLIENT_ID,
        chainConfig: {
          chainNamespace: CHAIN_NAMESPACES.OTHER,
          chainId: '0x1',
          rpcTarget: 'https://rpc.ankr.com/eth',
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
            defaultLanguage: 'en',
            dark: true
          }
        },
        loginSettings: {
          mfaLevel: 'optional'
        }
      })
      web3auth.configureAdapter(openloginAdapter)

      await web3auth.initModal()

      if (web3auth.connected && reconnect) {
        // since it is connected, we disconnect it for reconnecting
        await web3auth.logout({ cleanup: true })
        web3auth.clearCache()

        // reconnect
        return await Web3Auth.connect({ theme, reconnect })
      }

      if (!web3auth.connected) {
        // connect
        let provider
        if (!loginProvider) {
          let listener: any
          const modalHidden = new Promise<void>((resolve) => {
            listener = (visibility: boolean) => {
              if (!visibility) resolve()
            }
          })
          web3auth.on('MODAL_VISIBILITY', listener)
          provider = await Promise.any([web3auth.connect(), modalHidden])
          web3auth.off('MODAL_VISIBILITY', listener)
        } else {
          provider = await web3auth.connectTo(WALLET_ADAPTERS.OPENLOGIN, {
            loginProvider
          })
        }
        if (!provider) {
          return undefined
        }
      }

      return new Web3Auth(web3auth)
    } catch (err) {
      console.error(err)
      return undefined
    }
  }

  async getUserInfo(): Promise<Partial<UserInfo>> {
    if (!this.userInfo) {
      // cache
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
    console.log(userInfo)

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
      const privateKey = await this.web3auth.provider?.request<string>({
        method: 'private_key'
      })
      if (!privateKey) {
        return
      }
      // cache
      this.privateKey = hexlify(
        arrayify(privateKey, { allowMissingPrefix: true })
      )
    }

    return this.privateKey
  }

  async getMnemonic() {
    const privateKey = await this.getPrivateKey()
    if (!privateKey) {
      return
    }

    return entropyToMnemonic(privateKey)
  }

  async getUniqueHash() {
    const privateKey = await this.getPrivateKey()
    if (!privateKey) {
      return
    }

    return new ethers.Wallet(privateKey).address
  }
}
