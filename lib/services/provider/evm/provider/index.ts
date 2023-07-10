import assert from 'assert'

import { isErc4337Account } from '~lib/erc4337'
import { IChainAccount, INetwork } from '~lib/schema'
import { TransactionPayload } from '~lib/services/provider'

import { EvmClient, EvmErc4337Client, EvmTxParams } from '..'
import { EvmBasicProvider } from './provider'
import { EvmErc4337Provider } from './providerErc4337'

export { EvmBasicProvider } from './provider'
export { EvmErc4337Provider } from './providerErc4337'

export class EvmProvider extends EvmBasicProvider {
  private _erc4337Provider?: Promise<EvmErc4337Provider>
  private getErc4337Provider!: () => Promise<EvmErc4337Provider>

  static async from(network: INetwork): Promise<EvmProvider> {
    const client = await EvmClient.from(network)
    const provider = new EvmProvider(client)

    // Lazy load erc4337 provider
    provider.getErc4337Provider = async () => {
      if (!provider._erc4337Provider) {
        provider._erc4337Provider = (async () => {
          const client = await EvmErc4337Client.fromMayUndefined(network)
          assert(client) // TODO
          return new EvmErc4337Provider(client)
        })()
      }
      return await provider._erc4337Provider
    }

    return provider
  }

  async getNextNonce(
    account: IChainAccount,
    tag?: string | number
  ): Promise<number> {
    if (!(await isErc4337Account(account))) {
      return super.getNextNonce(account, tag)
    } else {
      return (await this.getErc4337Provider()).getNextNonce(account, tag)
    }
  }

  async estimateGas(account: IChainAccount, tx: any): Promise<string> {
    if (!(await isErc4337Account(account))) {
      return super.estimateGas(account, tx)
    } else {
      return (await this.getErc4337Provider()).estimateGas(account, tx)
    }
  }

  async populateTransaction(
    account: IChainAccount,
    transaction: EvmTxParams
  ): Promise<TransactionPayload> {
    if (!(await isErc4337Account(account))) {
      return super.populateTransaction(account, transaction)
    } else {
      return (await this.getErc4337Provider()).populateTransaction(
        account,
        transaction
      )
    }
  }

  async sendTransaction(
    account: IChainAccount,
    signedTransaction: any,
    extra?: any
  ): Promise<any> {
    if (!(await isErc4337Account(account))) {
      return super.sendTransaction(account, signedTransaction, extra)
    } else {
      return (await this.getErc4337Provider()).sendTransaction(
        account,
        signedTransaction,
        extra
      )
    }
  }

  async send(
    account: IChainAccount | undefined,
    method: string,
    params: Array<any>
  ): Promise<any> {
    if (!account || !(await isErc4337Account(account))) {
      return (this.provider as EvmClient).send(method, params)
    } else {
      return (
        (await this.getErc4337Provider()).provider as EvmErc4337Client
      ).send(method, params)
    }
  }
}
