import { resolveProperties } from '@ethersproject/properties'
import { TransactionRequest } from '@ethersproject/providers'
import type { UserOperationStruct } from '@zerodevapp/contracts'

import { IChainAccount } from '~lib/schema'
import { TransactionPayload } from '~lib/services/provider'
import { stall } from '~lib/utils'

import { EvmErc4337Client } from '../clientErc4337'
import { EvmTxParams, UserOperationResponse } from '../types'
import { EvmBasicProvider } from './provider'

export class EvmErc4337Provider extends EvmBasicProvider {
  async getNextNonce(
    account: IChainAccount,
    tag?: string | number
  ): Promise<number> {
    const client = this.provider as unknown as EvmErc4337Client
    const provider = await client.getProvider(account)

    const nonce = await provider.smartAccountAPI.getNonce()
    return nonce.toNumber()
  }

  async estimateGas(account: IChainAccount, tx: any): Promise<string> {
    const client = this.provider as unknown as EvmErc4337Client
    const provider = await client.getProvider(account)

    return (await provider.signer.estimateGas(tx)).toString()
  }

  async populateTransaction(
    account: IChainAccount,
    transaction: EvmTxParams
  ): Promise<TransactionPayload> {
    const payload = await super.populateTransaction(account, transaction)
    // TODO: check payload for erc4337
    return payload
  }

  async sendTransaction(
    account: IChainAccount,
    signedUserOperation: UserOperationStruct,
    request: TransactionRequest
  ): Promise<UserOperationResponse> {
    signedUserOperation = await resolveProperties(signedUserOperation)

    const client = this.provider as unknown as EvmErc4337Client
    const provider = await client.getProvider(account)
    const signer = provider.signer

    const transactionResponse =
      await signer.zdProvider.constructUserOpTransactionResponse(
        signedUserOperation
      )

    // Invoke the transaction hook
    signer.config.hooks?.transactionStarted?.({
      hash: transactionResponse.hash,
      from: signedUserOperation.sender as string,
      to: request.to! as string,
      value: request.value ?? 0,
      sponsored: signedUserOperation.paymasterAndData !== '0x'
    })

    if (signer.config.hooks?.userOperationStarted != null) {
      const proceed = await signer.config.hooks?.userOperationStarted(
        signedUserOperation
      )
      if (!proceed) {
        throw new Error('user operation rejected by user')
      }
    }

    try {
      await signer.httpRpcClient.sendUserOpToBundler(signedUserOperation)
    } catch (error: any) {
      console.error('sendUserOpToBundler failed', error)
      throw signer.unwrapError(error)
    }

    // TODO: handle errors - transaction that is "rejected" by bundler is _not likely_ to ever resolve its "wait()"

    const userOpHash = transactionResponse.hash

    const txMaxRetries = 5
    const txRetryIntervalMs = 2000
    const txRetryMulitplier = 1.5
    for (let i = 0; i < txMaxRetries; i++) {
      const txRetryIntervalWithJitterMs =
        txRetryIntervalMs * Math.pow(txRetryMulitplier, i) + Math.random() * 100

      await stall(txRetryIntervalWithJitterMs)

      try {
        return await client.getTransaction(userOpHash, account)
      } catch {
        // ignore
      }
    }

    throw new Error('failed to get user operation response')
  }
}
