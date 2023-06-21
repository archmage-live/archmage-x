import { Web3Auth } from '@web3auth/modal'
import { OpenloginAdapter } from '@web3auth/openlogin-adapter'

import { Web3auth, web3AuthInitOptions } from './web3auth'

export { WEB3AUTH_LOGIN_PROVIDER } from './web3auth'
export type { WEB3AUTH_LOGIN_PROVIDER_TYPE } from './web3auth'

export class Web3authModal extends Web3auth {
  static async create(theme: 'light' | 'dark' = 'light') {
    const [web3authOptions, openloginOptions] = web3AuthInitOptions()

    const web3auth = new Web3Auth({
      ...web3authOptions,
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

    const openloginAdapter = new OpenloginAdapter(openloginOptions)
    web3auth.configureAdapter(openloginAdapter)

    await web3auth.initModal()

    return new Web3authModal(web3auth)
  }

  private async connect(
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
      let listener: any
      const modalHidden = new Promise<void>((resolve) => {
        listener = (visibility: boolean) => {
          if (!visibility) resolve()
        }
      })
      web3auth.on('MODAL_VISIBILITY', listener)
      const provider = await Promise.any([
        (web3auth as Web3Auth).connect(),
        modalHidden
      ])
      web3auth.off('MODAL_VISIBILITY', listener)
      if (!provider) {
        return false
      }
    }

    return true
  }

  static async connect({
    reconnect = false,
    theme = 'light'
  }: {
    reconnect?: boolean
    theme?: 'light' | 'dark'
  }): Promise<Web3authModal | undefined> {
    const { promise, resolve } = Web3auth.SYNCHRONIZER.get()
    if (promise) {
      return promise
    }

    try {
      const wa = await Web3authModal.create(theme)
      const connected = wa.connect(reconnect)
      if (connected === undefined) {
        // reconnect
        return await Web3authModal.connect({ theme })
      } else if (!connected) {
        // failed
        resolve(undefined)
        return undefined
      }

      resolve(wa)
      return wa
    } catch (err) {
      console.error(err)
      resolve(undefined)
      return undefined
    }
  }
}
