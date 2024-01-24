import { arrayify, hexlify } from '@ethersproject/bytes'
import type {
  SolanaSignAndSendTransactionFeature,
  SolanaSignAndSendTransactionMethod,
  SolanaSignAndSendTransactionOutput,
  SolanaSignInFeature,
  SolanaSignInMethod,
  SolanaSignInOutput,
  SolanaSignMessageFeature,
  SolanaSignMessageMethod,
  SolanaSignMessageOutput,
  SolanaSignTransactionFeature,
  SolanaSignTransactionMethod,
  SolanaSignTransactionOutput
} from '@solana/wallet-standard-features'
import {
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction
} from '@solana/wallet-standard-features'
import { PublicKey } from '@solana/web3.js'
import type {
  IdentifierString,
  Wallet,
  WalletAccount,
  WalletIcon
} from '@wallet-standard/base'
import type {
  StandardConnectFeature,
  StandardConnectMethod,
  StandardDisconnectFeature,
  StandardDisconnectMethod,
  StandardEventsFeature
} from '@wallet-standard/features'
import {
  StandardConnect,
  StandardDisconnect,
  StandardEvents
} from '@wallet-standard/features'
import { registerWallet } from '@wallet-standard/wallet'
import assert from 'assert'
import archmageLogo from 'data-base64:~assets/archmage.svg'
import mitt, { Emitter } from 'mitt'

import { isBackgroundWorker } from '~lib/detect'
import {
  ArchmageWindow,
  Context,
  EventEmitter,
  EventType,
  Listener,
  RpcClientInjected,
  context
} from '~lib/inject/client'

export const SOL_PROVIDER_NAME = 'solProvider'

export interface ISolProviderService extends EventEmitter {
  request(
    args: { method: string; params?: Array<any> },
    ctx?: Context
  ): Promise<any>
}

export class SolWallet implements Wallet {
  version = '1.0.0' as const
  name = 'Archmage'
  icon = archmageLogo as WalletIcon

  #activeChain: IdentifierString | null = null
  #chains: IdentifierString[] = []
  #accounts: WalletAccount[] = []

  #events: Emitter<Record<EventType, any>> = mitt()

  get chains() {
    return this.#chains
  }

  get accounts() {
    return this.#accounts
  }

  constructor(private service: ISolProviderService) {
    this.#init().finally()
  }

  async #init() {
    this.#chains = await this.service.request(
      {
        method: 'chains'
      },
      context()
    )

    this.service.on('networkChanged', ({ network }: { network: string }) => {
      this.#activeChain = network as IdentifierString
      this.#accounts = this.#accounts.map((account) => ({
        ...account,
        chains: this.#activeChain ? [this.#activeChain] : []
      }))
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

  #setAccounts(accounts: { address: string; publicKey?: string }[]) {
    this.#accounts = accounts.map(({ address, publicKey }) => {
      return {
        address,
        publicKey: publicKey
          ? new PublicKey(publicKey).toBytes()
          : new Uint8Array(),
        chains: this.#activeChain ? [this.#activeChain] : [],
        features: [
          SolanaSignAndSendTransaction,
          SolanaSignTransaction,
          SolanaSignMessage
        ]
      }
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

  #disconnect: StandardDisconnectMethod = async () => {
    await this.service.request(
      {
        method: 'disconnect'
      },
      context()
    )

    this.#setAccounts([])

    this.#events.emit('change', { accounts: this.accounts })
  }

  #on = (event: EventType, listener: Listener) => {
    this.#events.on(event, listener)
    return () => this.#events.off(event, listener)
  }

  #signAndSendTransaction: SolanaSignAndSendTransactionMethod = async (
    ...inputs
  ) => {
    const outputs: SolanaSignAndSendTransactionOutput[] = []

    if (inputs.length === 1) {
      const input = inputs[0]
      assert(
        input.account.address === this.accounts[0]?.address,
        'Account must match the current account'
      )
      assert(
        this.chains.includes(input.chain),
        'Chain must be supported by the wallet'
      )
      // signature is also the transaction id
      const signature = await this.service.request(
        {
          method: 'signAndSendTransaction',
          params: [hexlify(input.transaction), input.chain, input.options]
        },
        context()
      )
      outputs.push({ signature: arrayify(signature) })
    } else {
      for (const input of inputs) {
        outputs.push(...(await this.#signAndSendTransaction(input)))
      }
    }

    return outputs
  }

  #signTransaction: SolanaSignTransactionMethod = async (...inputs) => {
    const outputs: SolanaSignTransactionOutput[] = []

    if (inputs.length === 1) {
      const input = inputs[0]
      assert(
        input.account.address === this.accounts[0]?.address,
        'Account must match the current account'
      )
      assert(
        !input.chain || this.chains.includes(input.chain),
        'Chain must be supported by the wallet'
      )
      const serializedTransaction = await this.service.request(
        {
          method: 'signTransaction',
          params: [hexlify(input.transaction)]
        },
        context()
      )
      outputs.push({ signedTransaction: arrayify(serializedTransaction) })
    } else {
      let chain: IdentifierString | undefined
      const transactions = inputs.map((input) => {
        assert(
          input.account.address === this.accounts[0]?.address,
          'Account must match the current account'
        )
        if (input.chain) {
          assert(
            this.chains.includes(input.chain),
            'Chain must be supported by the wallet'
          )
          if (chain) {
            assert(
              input.chain === chain,
              'All transactions must be for the same chain'
            )
          } else {
            chain = input.chain
          }
        }
        return hexlify(input.transaction)
      })
      const serializedTransactions: string[] = await this.service.request(
        {
          method: 'signAllTransactions',
          params: [transactions]
        },
        context()
      )
      outputs.push(
        ...serializedTransactions.map((serializedTransaction) => {
          return { signedTransaction: arrayify(serializedTransaction) }
        })
      )
    }

    return outputs
  }

  #signMessage: SolanaSignMessageMethod = async (...inputs) => {
    const outputs: SolanaSignMessageOutput[] = []

    if (inputs.length === 1) {
      const input = inputs[0]
      assert(
        input.account.address === this.accounts[0]?.address,
        'Account must match the current account'
      )
      const signature = await this.service.request(
        {
          method: 'signMessage',
          params: [hexlify(input.message)]
        },
        context()
      )
      outputs.push({
        signedMessage: input.message,
        signature: arrayify(signature)
      })
    } else {
      for (const input of inputs) {
        outputs.push(...(await this.#signMessage(input)))
      }
    }

    return outputs
  }

  #signIn: SolanaSignInMethod = async (...inputs) => {
    const outputs: SolanaSignInOutput[] = []

    if (inputs.length === 1) {
      const input = inputs[0]
      const output: SolanaSignInOutput = await this.service.request(
        {
          method: 'signMessage',
          params: [input]
        },
        context()
      )
      assert(
        output.account.address === this.accounts[0]?.address,
        'Account must match the current account'
      )
      outputs.push({
        account: this.accounts[0],
        signedMessage: arrayify(output.signedMessage),
        signature: arrayify(output.signature)
      })
    } else {
      for (const input of inputs) {
        outputs.push(...(await this.#signIn(input)))
      }
    }

    return outputs
  }

  get features(): StandardConnectFeature &
    StandardDisconnectFeature &
    StandardEventsFeature &
    SolanaSignAndSendTransactionFeature &
    SolanaSignTransactionFeature &
    SolanaSignMessageFeature &
    SolanaSignInFeature {
    return {
      [StandardConnect]: {
        version: '1.0.0',
        connect: this.#connect
      },
      [StandardDisconnect]: {
        version: '1.0.0',
        disconnect: this.#disconnect
      },
      [StandardEvents]: {
        version: '1.0.0',
        on: this.#on
      },
      [SolanaSignAndSendTransaction]: {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signAndSendTransaction: this.#signAndSendTransaction
      },
      [SolanaSignTransaction]: {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signTransaction: this.#signTransaction
      },
      [SolanaSignMessage]: {
        version: '1.0.0',
        signMessage: this.#signMessage
      },
      [SolanaSignIn]: {
        version: '1.0.0',
        signIn: this.#signIn
      }
    }
  }
}

if (
  !isBackgroundWorker() &&
  process.env.PLASMO_PUBLIC_ENABLE_SOLANA &&
  !globalThis.archmage.sol
) {
  const service =
    RpcClientInjected.instance().service<ISolProviderService>(SOL_PROVIDER_NAME)

  const sol = new SolWallet(service)

  registerWallet(sol)

  globalThis.archmage.sol = sol
}

export interface SolWindow extends ArchmageWindow {}

declare const globalThis: SolWindow
