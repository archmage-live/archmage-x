import type { UserOperationRequest } from '@alchemy/aa-core'
import { resolveProperties } from '@ethersproject/properties'
import { TransactionRequest } from '@ethersproject/providers'
import type { UserOperationStruct } from '@zerodevapp/contracts'
import assert from 'assert'

import { IChainAccount } from '~lib/schema'
import { TransactionPayload } from '~lib/services/provider'

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
    request?: TransactionRequest
  ): Promise<UserOperationResponse> {
    assert(request)
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

    const userOp: UserOperationResponse = {
      hash: transactionResponse.hash,
      ...(signedUserOperation as UserOperationRequest)
    }

    return await client._wrapTransaction(userOp, account)
  }

  async getTransaction(
    userOpHash: string | Promise<string>,
    account?: IChainAccount
  ): Promise<UserOperationResponse> {
    const client = this.provider as unknown as EvmErc4337Client
    return client.getTransaction(userOpHash, account)
  }
}
