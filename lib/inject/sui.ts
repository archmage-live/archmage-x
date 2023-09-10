// https://github.com/MystenLabs/sui/blob/main/apps/wallet/src/dapp-interface/WalletStandardInterface.ts
import { hexlify } from '@ethersproject/bytes'
import { fromB64 } from '@mysten/bcs'
import { isTransactionBlock } from '@mysten/sui.js/transactions'
import { normalizeSuiAddress } from '@mysten/sui.js/utils'
import { registerWallet } from '@mysten/wallet-standard'
import type {
  IdentifierString,
  StandardConnectFeature,
  StandardConnectMethod,
  StandardEventsFeature,
  SuiFeatures,
  SuiSignAndExecuteTransactionBlockMethod,
  SuiSignMessageMethod,
  SuiSignPersonalMessageMethod,
  SuiSignTransactionBlockMethod,
  Wallet,
  WalletAccount,
  WalletIcon
} from '@mysten/wallet-standard'
import assert from 'assert'
import archmageLogo from 'data-base64:~assets/archmage.svg'
import mitt, { Emitter } from 'mitt'

import { isBackgroundWorker } from '~lib/detect'
import {
  Context,
  EventEmitter,
  EventType,
  Listener,
  RpcClientInjected,
  context
} from '~lib/inject/client'

export const SUI_PROVIDER_NAME = 'suiProvider'

export interface ISuiProviderService extends EventEmitter {
  request(
    args: { method: string; params?: Array<any> },
    ctx?: Context
  ): Promise<any>
}

type StakeInput = { validatorAddress: string }
type SuiWalletStakeFeature = {
  'suiWallet:stake': {
    version: '0.0.1'
    stake: (input: StakeInput) => Promise<void>
  }
}

export class SuiWallet implements Wallet {
  version = '1.0.0' as const
  name = 'Archmage'
  icon = archmageLogo as WalletIcon
  #accounts: WalletAccount[] = []
  #activeChain: IdentifierString | null = null
  #chains: IdentifierString[] = []
  #events: Emitter<Record<EventType, any>> = mitt()

  constructor(private service: ISuiProviderService) {
    this.init().finally()
  }

  async init() {
    this.#chains = await this.service.request(
      {
        method: 'chains'
      },
      context()
    )

    this.service.on('networkChanged', ({ network }: { network: string }) => {
      this.#activeChain = network as IdentifierString
    })

    this.service.on('accountsChanged', async () => {
      const accounts = await this.service.request(
        { method: 'accounts' },
        context()
      )

      this.#setAccounts(accounts)

      this.#events.emit('change', { accounts: this.accounts })
    })
  }

  #connect: StandardConnectMethod = async (input) => {
    const { network, accounts } = await this.service.request(
      {
        method: 'connect',
        params: [input?.silent]
      },
      context()
    )

    this.#activeChain = network
    this.#setAccounts(accounts)

    this.#events.emit('change', { accounts: this.accounts })

    return {
      accounts: this.accounts
    }
  }

  #setAccounts(accounts: { address: string; publicKey?: string }[]) {
    this.#accounts = accounts.map(({ address, publicKey }) => {
      return {
        address,
        publicKey: publicKey ? fromB64(publicKey) : new Uint8Array(),
        chains: this.#activeChain ? [this.#activeChain] : [],
        features: ['sui:signAndExecuteTransaction']
      }
    })
  }

  #on = (event: EventType, listener: Listener) => {
    this.#events.on(event, listener)
    return () => this.#events.off(event, listener)
  }

  get chains() {
    return this.#chains
  }

  get accounts() {
    return this.#accounts
  }

  get features(): StandardConnectFeature &
    StandardEventsFeature &
    SuiFeatures &
    SuiWalletStakeFeature {
    return {
      'standard:connect': {
        version: '1.0.0',
        connect: this.#connect
      },
      'standard:events': {
        version: '1.0.0',
        on: this.#on
      },
      'sui:signTransactionBlock': {
        version: '1.0.0',
        signTransactionBlock: this.#signTransactionBlock
      },
      'sui:signAndExecuteTransactionBlock': {
        version: '1.0.0',
        signAndExecuteTransactionBlock: this.#signAndExecuteTransactionBlock
      },
      'suiWallet:stake': {
        version: '0.0.1',
        stake: this.#stake
      },
      'sui:signMessage': {
        version: '1.0.0',
        signMessage: this.#signMessage
      },
      'sui:signPersonalMessage': {
        version: '1.0.0',
        signPersonalMessage: this.#signPersonalMessage
      }
    }
  }

  #signTransactionBlock: SuiSignTransactionBlockMethod = async (input) => {
    assert(
      !input.account ||
        normalizeSuiAddress(input.account.address) ===
          normalizeSuiAddress(this.accounts[0]?.address),
      'Account must match the current account'
    )
    if (!isTransactionBlock(input.transactionBlock)) {
      throw new Error(
        'Unexpect transaction format found. Ensure that you are using the `Transaction` class.'
      )
    }
    return await this.service.request(
      {
        method: 'signTransactionBlock',
        params: [input.transactionBlock.serialize()]
      },
      context()
    )
  }

  #signAndExecuteTransactionBlock: SuiSignAndExecuteTransactionBlockMethod =
    async (input) => {
      assert(
        !input.account ||
          normalizeSuiAddress(input.account.address) ===
            normalizeSuiAddress(this.accounts[0]?.address),
        'Account must match the current account'
      )
      if (!isTransactionBlock(input.transactionBlock)) {
        throw new Error(
          'Unexpect transaction format found. Ensure that you are using the `Transaction` class.'
        )
      }

      return await this.service.request(
        {
          method: 'signAndExecuteTransactionBlock',
          params: [input.transactionBlock.serialize(), input.options]
        },
        context()
      )
    }

  #stake = async (input: StakeInput) => {
    return await this.service.request(
      {
        method: 'stake',
        params: [input.validatorAddress]
      },
      context()
    )
  }

  #signMessage: SuiSignMessageMethod = async ({ message, account }) => {
    const { bytes, signature } = await this.#signPersonalMessage({
      message,
      account
    })
    return {
      messageBytes: bytes,
      signature
    }
  }

  #signPersonalMessage: SuiSignPersonalMessageMethod = async ({
    message,
    account
  }) => {
    assert(
      normalizeSuiAddress(account.address) ===
        normalizeSuiAddress(this.accounts[0]?.address),
      'Account must match the current account'
    )
    return await this.service.request(
      {
        method: 'signMessage',
        params: [hexlify(message)]
      },
      context()
    )
  }
}

if (
  !isBackgroundWorker() &&
  process.env.PLASMO_PUBLIC_ENABLE_SUI &&
  !globalThis.archmage.sui
) {
  const service =
    RpcClientInjected.instance().service<ISuiProviderService>(SUI_PROVIDER_NAME)

  const sui = new SuiWallet(service)

  registerWallet(sui)

  globalThis.archmage.sui = sui
}
