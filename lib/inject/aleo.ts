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

import { isBackgroundWorker } from '~lib/detect'
import {
  ArchmageWindow,
  Context,
  EventEmitter,
  RpcClientInjected
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
  constructor(private service: IAleoProviderService) {
    super()
  }

  connect(
    decryptPermission: DecryptPermission,
    network: WalletAdapterNetwork,
    programs?: string[]
  ): Promise<void> {
    return Promise.resolve(undefined)
  }

  disconnect(): Promise<void> {
    return Promise.resolve(undefined)
  }

  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }> {
    return Promise.resolve({ signature: new Uint8Array() })
  }

  decrypt(
    cipherText: string,
    tpk?: string,
    programId?: string,
    functionName?: string,
    index?: number
  ): Promise<{
    text: string
  }> {
    return Promise.resolve({ text: '' })
  }

  requestRecords(program: string): Promise<{ records: any[] }> {
    return Promise.resolve({ records: [] })
  }

  requestTransaction(
    transaction: AleoTransaction
  ): Promise<{ transactionId?: string }> {
    return Promise.resolve({})
  }

  requestExecution(
    transaction: AleoTransaction
  ): Promise<{ transactionId?: string }> {
    return Promise.resolve({})
  }

  requestBulkTransactions(
    transactions: AleoTransaction[]
  ): Promise<{ transactionIds?: string[] }> {
    return Promise.resolve({})
  }

  requestDeploy(
    deployment: AleoDeployment
  ): Promise<{ transactionId?: string }> {
    return Promise.resolve({})
  }

  transactionStatus(transactionId: string): Promise<{ status: string }> {
    return Promise.resolve({ status: '' })
  }

  getExecution(transactionId: string): Promise<{ execution: string }> {
    return Promise.resolve({ execution: '' })
  }

  requestRecordPlaintexts(program: string): Promise<{ records: any[] }> {
    return Promise.resolve({ records: [] })
  }

  requestTransactionHistory(program: string): Promise<{ transactions: any[] }> {
    return Promise.resolve({ transactions: [] })
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

  globalThis.archmage.sui = aleo
  globalThis.leoWallet = aleo
}

export interface AleoWindow extends ArchmageWindow {
  leoWallet?: AleoWallet
}

declare const globalThis: AleoWindow
