import { VoidSigner } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { Logger } from '@ethersproject/logger'
import { shallowCopy } from '@ethersproject/properties'
import { BaseProvider } from '@ethersproject/providers'
import { ethErrors } from 'eth-rpc-errors'
import PQueue from 'p-queue'

import { IChainAccount } from '~lib/schema'
import { ETH_BALANCE_CHECKER_API } from '~lib/services/datasource/ethBalanceChecker'
import { getNonce } from '~lib/services/provider/hooks'
import { Provider, TransactionPayload } from '~lib/services/provider/provider'
import { getSigningWallet } from '~lib/wallet'

import { logger } from '../client'
import { fetchGasFeeEstimates } from '../gasFee'
import { reduceTypes } from '../typedData'
import {
  EvmTxParams,
  EvmTxPopulatedParams,
  allowedTransactionKeys
} from '../types'

export class EvmBasicProvider implements Provider {
  protected constructor(public provider: BaseProvider) {}

  async isOk(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber()
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async isContract(address: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(address)
      if (code && code !== '0x') return true
    } catch {}
    return false
  }

  async getNextNonce(
    account: IChainAccount,
    tag?: string | number
  ): Promise<number> {
    return this.provider.getTransactionCount(account.address!, tag || 'pending')
  }

  async getBalance(
    accountOrAddress: IChainAccount | string
  ): Promise<string | undefined> {
    const address =
      typeof accountOrAddress === 'object'
        ? accountOrAddress.address
        : accountOrAddress
    if (!address) {
      return
    }
    const balance = await this.provider.getBalance(address)
    return balance.toString()
  }

  async getBalances(
    accountsOrAddresses: IChainAccount[] | string[]
  ): Promise<(string | undefined)[]> {
    const addresses = accountsOrAddresses
      .map((acc) => (typeof acc === 'object' ? acc.address : acc))
      .filter((addr) => !!addr) as string[]

    const balances = await ETH_BALANCE_CHECKER_API.getAddressesBalances(
      this.provider,
      addresses
    )
    if (balances) {
      const balancesMap = new Map<string, string>()
      for (const addr of Object.keys(balances)) {
        const balance = balances[addr][ETH_BALANCE_CHECKER_API.NATIVE_TOKEN]
        if (balance) {
          balancesMap.set(addr, balance)
        }
      }

      if (balancesMap.size === addresses.length) {
        return accountsOrAddresses
          .map((acc) => (typeof acc === 'object' ? acc.address : acc))
          .map((addr) => (addr ? balancesMap.get(addr) : undefined))
      }
    }

    const queue = new PQueue({ concurrency: 3 })
    return await queue.addAll(
      accountsOrAddresses.map((acc) => () => this.getBalance(acc))
    )
  }

  async estimateGasPrice(account: IChainAccount): Promise<any> {
    return fetchGasFeeEstimates(this.provider)
  }

  async estimateGas(account: IChainAccount, tx: any): Promise<string> {
    const voidSigner = new VoidSigner(account.address!, this.provider)

    const estimateGas = async (tx: any) => {
      return await voidSigner.estimateGas(tx).catch((error) => {
        if (forwardErrors.indexOf(error.code) >= 0) {
          throw error
        }

        return logger.throwError(
          'cannot estimate gas; transaction may fail or may require manual gas limit',
          Logger.errors.UNPREDICTABLE_GAS_LIMIT,
          {
            error: error,
            tx: tx
          }
        )
      })
    }

    try {
      return (await estimateGas(tx)).toString()
    } catch (error: any) {
      if (
        error.code === Logger.errors.INSUFFICIENT_FUNDS &&
        tx.value &&
        BigNumber.from(tx.value).gt(0) &&
        !tx.data?.length
      ) {
        // retry without value
        const txCopy = shallowCopy(tx)
        delete txCopy.value
        return (await estimateGas(txCopy)).toString()
      } else {
        throw error
      }
    }
  }

  estimateGasFee(account: IChainAccount, tx: any): Promise<string> {
    throw new Error('not implemented')
  }

  async populateTransaction(
    account: IChainAccount,
    transaction: EvmTxParams
  ): Promise<TransactionPayload> {
    const signer = new VoidSigner(account.address!, this.provider)

    for (const key in transaction) {
      if (allowedTransactionKeys.indexOf(key) === -1) {
        logger.throwArgumentError(
          'invalid transaction key: ' + key,
          'transaction',
          transaction
        )
      }
    }

    const tx = shallowCopy(transaction)

    const from = await signer.getAddress()
    if (!tx.from) {
      tx.from = from
    } else {
      // Make sure any provided address matches this signer
      if (tx.from.toLowerCase() !== from.toLowerCase()) {
        logger.throwArgumentError(
          'from address mismatch',
          'transaction',
          transaction
        )
      }
    }

    if (tx.to != null) {
      const to = await signer.resolveName(tx.to)
      if (!to) {
        logger.throwArgumentError(
          'provided ENS name resolves to null',
          'tx.to',
          to
        )
      }
      tx.to = to
    }

    // trick
    if (typeof tx.type === 'string') {
      tx.type = Number(tx.type)
    }

    // Do not allow mixing pre-eip-1559 and eip-1559 properties
    const hasEip1559 =
      tx.maxFeePerGas != null || tx.maxPriorityFeePerGas != null
    if (tx.gasPrice != null && (tx.type === 2 || hasEip1559)) {
      logger.throwArgumentError(
        'eip-1559 transaction do not support gasPrice',
        'transaction',
        transaction
      )
    } else if ((tx.type === 0 || tx.type === 1) && hasEip1559) {
      logger.throwArgumentError(
        'pre-eip-1559 transaction do not support maxFeePerGas/maxPriorityFeePerGas',
        'transaction',
        transaction
      )
    }

    const populatedParams: EvmTxPopulatedParams = {}

    if (
      (tx.type === 2 || tx.type == null) &&
      tx.maxFeePerGas != null &&
      tx.maxPriorityFeePerGas != null
    ) {
      // Fully-formed EIP-1559 transaction (skip getFeeData)
      tx.type = 2
    } else if (tx.type === 0 || tx.type === 1) {
      // Explicit Legacy or EIP-2930 transaction

      // Populate missing gasPrice
      if (tx.gasPrice == null) {
        populatedParams.gasPrice = await signer.getGasPrice()
      }
    } else {
      // We need to get fee data to determine things
      const feeData = await signer.getFeeData()

      if (tx.type == null) {
        // We need to auto-detect the intended type of this transaction...

        if (
          feeData.maxFeePerGas != null &&
          feeData.maxPriorityFeePerGas != null
        ) {
          // The network supports EIP-1559!

          // Upgrade transaction from null to eip-1559
          tx.type = 2

          if (tx.gasPrice != null) {
            // Using legacy gasPrice property on an eip-1559 network,
            // so use gasPrice as both fee properties
            const gasPrice = tx.gasPrice
            delete tx.gasPrice
            tx.maxFeePerGas = gasPrice
            tx.maxPriorityFeePerGas = gasPrice
          } else {
            // Populate missing fee data
            if (tx.maxFeePerGas == null) {
              populatedParams.maxFeePerGas = feeData.maxFeePerGas
            }
            if (tx.maxPriorityFeePerGas == null) {
              populatedParams.maxPriorityFeePerGas =
                feeData.maxPriorityFeePerGas
            }
          }
        } else if (feeData.gasPrice != null) {
          // Network doesn't support EIP-1559...

          // ...but they are trying to use EIP-1559 properties
          if (hasEip1559) {
            logger.throwError(
              'network does not support EIP-1559',
              Logger.errors.UNSUPPORTED_OPERATION,
              {
                operation: 'populateTransaction'
              }
            )
          }

          // Populate missing fee data
          if (tx.gasPrice == null) {
            populatedParams.gasPrice = feeData.gasPrice
          }

          // Explicitly set untyped transaction to legacy
          tx.type = 0
        } else {
          // getFeeData has failed us.
          logger.throwError(
            'failed to get consistent fee data',
            Logger.errors.UNSUPPORTED_OPERATION,
            {
              operation: 'signer.getFeeData'
            }
          )
        }
      } else if (tx.type === 2) {
        // Explicitly using EIP-1559

        // Populate missing fee data
        if (tx.maxFeePerGas == null) {
          populatedParams.maxFeePerGas = feeData.maxFeePerGas || undefined
        }
        if (tx.maxPriorityFeePerGas == null) {
          populatedParams.maxPriorityFeePerGas =
            feeData.maxPriorityFeePerGas || undefined
        }
      }
    }

    tx.nonce = await getNonce(this, account)

    if ((tx as any).gas != null) {
      if (tx.gasLimit != null) {
        logger.throwArgumentError(
          'gas and gasLimit cannot be both specified',
          'transaction',
          transaction
        )
      }
      tx.gasLimit = (tx as any).gas
      delete (tx as any).gas
    }

    if (tx.gasLimit == null) {
      try {
        tx.gasLimit = await this.estimateGas(account, tx)
      } catch (error: any) {
        tx.gasLimit = 28500000
        if (forwardErrors.indexOf(error.code) >= 0) {
          populatedParams.code = error.code
        }
        populatedParams.error = error.toString()
      }
    }

    const chainId = +account.chainId
    if (tx.chainId == null) {
      tx.chainId = chainId
    } else {
      if (tx.chainId !== chainId) {
        logger.throwArgumentError(
          'chainId mismatch',
          'transaction',
          transaction
        )
      }
    }

    if (tx.data?.length === 0) {
      tx.data = undefined
    }

    return { txParams: tx, populatedParams } as TransactionPayload
  }

  async signTransaction(
    account: IChainAccount,
    transaction: any
  ): Promise<any> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signTransaction(transaction)
  }

  async sendTransaction(
    account: IChainAccount,
    signedTransaction: any
  ): Promise<any> {
    return this.provider.sendTransaction(signedTransaction)
  }

  async signMessage(account: IChainAccount, message: any): Promise<any> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signMessage(message)
  }

  async getTypedData(typedData: any): Promise<any> {
    const { domain, types: originalTypes, primaryType, message } = typedData
    const types = reduceTypes(originalTypes, primaryType)
    const populated = await _TypedDataEncoder.resolveNames(
      domain,
      types,
      message,
      (name: string) => {
        return this.provider.resolveName(name) as Promise<string>
      }
    )
    typedData = _TypedDataEncoder.getPayload(
      populated.domain,
      types,
      populated.value
    )
    delete typedData.types.EIP712Domain
    if (primaryType != null && primaryType !== typedData.primaryType) {
      throw ethErrors.rpc.invalidParams('Invalid primaryType')
    }
    return typedData
  }

  async signTypedData(account: IChainAccount, typedData: any): Promise<any> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signTypedData(typedData)
  }

  async isSignable(account: IChainAccount): Promise<boolean> {
    return !!(await getSigningWallet(account))
  }
}

const forwardErrors = [
  Logger.errors.INSUFFICIENT_FUNDS,
  Logger.errors.NONCE_EXPIRED,
  Logger.errors.REPLACEMENT_UNDERPRICED
]
