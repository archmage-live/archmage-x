import {
  AleoDeployment,
  EventEmitter as AleoEventEmitter,
  AleoTransaction,
  DecryptPermission,
  WalletAdapterNetwork
} from '@demox-labs/aleo-wallet-adapter-base'
import type {
  LeoWallet,
  LeoWalletEvents
} from '@demox-labs/aleo-wallet-adapter-leo'
import { arrayify, hexlify } from '@ethersproject/bytes'

import { isBackgroundWorker } from '~lib/detect'
import {
  ArchmageWindow,
  Context,
  EventEmitter,
  RpcClientInjected,
  context
} from '~lib/inject/client'

export const ALEO_PROVIDER_NAME = 'aleoProvider'

export interface IAleoProviderService extends EventEmitter {
  request(
    args: { method: string; params?: Array<any> },
    ctx?: Context
  ): Promise<any>
}

export class AleoWallet
  extends AleoEventEmitter<LeoWalletEvents>
  implements LeoWallet
{
  publicKey?: string // address
  #network?: string // once connected, it won't change; except for disconnected, then it's undefined

  constructor(private service: IAleoProviderService) {
    super()

    this.#init().finally()
  }

  async #init() {
    this.service.on(
      'networkChanged',
      async ({ network }: { network: string }) => {
        if (this.#network && network !== this.#network) {
          // disconnect if network changed; DApp should connect again
          await this.disconnect()
        }
      }
    )

    this.service.on('accountsChanged', async () => {
      const accounts = await this.service.request(
        { method: 'accounts' },
        context()
      )

      if (!this.#network) {
        // not connected
        return
      }

      this.publicKey = accounts[0].address

      this.emit('accountChange', this.publicKey)
    })
  }

  async connect(
    decryptPermission: DecryptPermission,
    network: WalletAdapterNetwork,
    programs?: string[]
  ): Promise<void> {
    switch (decryptPermission) {
      case DecryptPermission.NoDecrypt:
      case DecryptPermission.UponRequest:
      case DecryptPermission.AutoDecrypt:
      case DecryptPermission.OnChainHistory:
        break
      default:
        throw new Error(`Unsupported decryptPermission: ${decryptPermission}`)
    }

    if (programs?.some((program) => !program.endsWith('.aleo'))) {
      throw new Error('Invalid programs')
    }

    const { accounts } = await this.service.request(
      {
        method: 'connect',
        params: [decryptPermission, network, programs]
      },
      context()
    )

    this.publicKey = accounts[0].address
    this.#network = network

    this.emit('connect', network)
  }

  async disconnect(): Promise<void> {
    await this.service.request(
      {
        method: 'disconnect'
      },
      context()
    )

    this.publicKey = undefined
    this.#network = undefined

    this.emit('disconnect')
  }

  async isAvailable(): Promise<boolean> {
    // Archmage is always available
    return true
  }

  async signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }> {
    // The signature is bech32m encoded string
    const signature = await this.service.request(
      {
        method: 'signMessage',
        params: [hexlify(message)]
      },
      context()
    )

    return {
      signature: new TextEncoder().encode(signature)
    }
  }

  async decrypt(
    ciphertext: string,
    tpk?: string,
    programId?: string,
    functionName?: string,
    index?: number
  ): Promise<{
    text: string
  }> {
    const plaintext = await this.service.request(
      {
        method: 'decrypt',
        params: [ciphertext, tpk, programId, functionName, index]
      },
      context()
    )
    return {
      text: plaintext
    }
  }

  async requestRecords(program: string): Promise<{ records: any[] }> {
    return await this.service.request(
      {
        method: 'requestRecords',
        params: [program]
      },
      context()
    )
  }

  async requestTransaction(
    transaction: AleoTransaction
  ): Promise<{ transactionId?: string }> {
    return await this.service.request(
      {
        method: 'requestTransaction',
        params: [transaction]
      },
      context()
    )
  }

  async requestExecution(
    transaction: AleoTransaction
  ): Promise<{ transactionId?: string }> {
    return await this.service.request(
      {
        method: 'requestExecution',
        params: [transaction]
      },
      context()
    )
  }

  async requestBulkTransactions(
    transactions: AleoTransaction[]
  ): Promise<{ transactionIds?: string[] }> {
    return await this.service.request(
      {
        method: 'requestBulkTransactions',
        params: [transactions]
      },
      context()
    )
  }

  async requestDeploy(
    deployment: AleoDeployment
  ): Promise<{ transactionId?: string }> {
    return await this.service.request(
      {
        method: 'requestDeploy',
        params: [deployment]
      },
      context()
    )
  }

  async transactionStatus(transactionId: string): Promise<{ status: string }> {
    return await this.service.request(
      {
        method: 'transactionStatus',
        params: [transactionId]
      },
      context()
    )
  }

  async getExecution(transactionId: string): Promise<{ execution: string }> {
    return await this.service.request(
      {
        method: 'getExecution',
        params: [transactionId]
      },
      context()
    )
  }

  async requestRecordPlaintexts(program: string): Promise<{ records: any[] }> {
    return await this.service.request(
      {
        method: 'requestRecordPlaintexts',
        params: [program]
      },
      context()
    )
  }

  async requestTransactionHistory(
    program: string
  ): Promise<{ transactions: any[] }> {
    return await this.service.request(
      {
        method: 'requestTransactionHistory',
        params: [program]
      },
      context()
    )
  }
}

if (
  !isBackgroundWorker() &&
  process.env.PLASMO_PUBLIC_ENABLE_ALEO &&
  !globalThis.archmage.aleo
) {
  const service =
    RpcClientInjected.instance().service<IAleoProviderService>(
      ALEO_PROVIDER_NAME
    )

  const aleo = new AleoWallet(service)

  globalThis.archmage.aleo = aleo
  globalThis.leoWallet = aleo
  globalThis.leo = aleo
}

export interface AleoWindow extends ArchmageWindow {
  leoWallet?: AleoWallet
  leo?: AleoWallet
}

declare const globalThis: AleoWindow
