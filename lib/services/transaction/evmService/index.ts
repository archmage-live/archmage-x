import { FunctionFragment } from '@ethersproject/abi'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { hexlify } from '@ethersproject/bytes'
import { TransactionRequest } from '@ethersproject/providers'
import {
  SafeMultisigTransactionResponse,
  SafeTransactionData
} from '@safe-global/safe-core-sdk-types'
import { useAsync } from 'react-use'

import { isBackgroundWorker } from '~lib/detect'
import { isErc4337Account } from '~lib/erc4337'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { SafeTransactionResponse, isSafeAccount } from '~lib/safe'
import { IChainAccount, INetwork, IPendingTx, ITransaction } from '~lib/schema'
import { useEtherScanProvider } from '~lib/services/datasource/etherscan'
import {
  UserOperationResponse,
  useEvmFunctionSignature
} from '~lib/services/provider/evm'
import { ITransactionService, TransactionInfo } from '~lib/services/transaction'
import {
  EvmSafeTransactionService,
  getEvmSafeTransactionInfo
} from '~lib/services/transaction/evmService/evmSafeService'
import { WALLET_SERVICE } from '~lib/services/wallet'

import {
  EvmErc4337TransactionService,
  getEvmErc4337TransactionInfo
} from './evmErc4337Service'
import {
  EvmBasicTransactionService,
  EvmTransactionServicePartial,
  ReducedTransactionResponse,
  getEvmTransactionInfo
} from './evmService'

export * from './evmService'
export * from './evmErc4337Service'
export * from './evmSafeService'

export function isEvmTransactionResponse(
  tx:
    | ReducedTransactionResponse
    | UserOperationResponse
    | SafeMultisigTransactionResponse
    | SafeTransactionResponse
): tx is ReducedTransactionResponse {
  return !!(tx as ReducedTransactionResponse).from
}

export function isEvmUserOperationResponse(
  tx:
    | ReducedTransactionResponse
    | UserOperationResponse
    | SafeMultisigTransactionResponse
    | SafeTransactionResponse
): tx is UserOperationResponse {
  return !!(tx as UserOperationResponse).sender
}

export function isEvmSafeTransactionResponse(
  tx:
    | ReducedTransactionResponse
    | UserOperationResponse
    | SafeMultisigTransactionResponse
    | SafeTransactionResponse
): tx is SafeMultisigTransactionResponse | SafeTransactionResponse {
  return (
    !!(tx as SafeMultisigTransactionResponse).safe ||
    !!(tx as SafeTransactionResponse).txType
  )
}

export function getEvmGeneralTransactionInfo(
  transaction: IPendingTx | ITransaction
): TransactionInfo {
  const tx = transaction.info.tx
  if (isEvmTransactionResponse(tx)) {
    return getEvmTransactionInfo(transaction)
  } else if (isEvmUserOperationResponse(tx)) {
    return getEvmErc4337TransactionInfo(transaction)
  } else {
    return getEvmSafeTransactionInfo(transaction)
  }
}

export class EvmTransactionService extends EvmTransactionServicePartial {
  private basic = new EvmBasicTransactionService()
  private erc4337 = new EvmErc4337TransactionService()
  private safe = new EvmSafeTransactionService()

  async signAndSendTx(
    account: IChainAccount,
    request: TransactionRequest | SafeTransactionData,
    origin?: string,
    functionSig?: FunctionFragment,
    replace?: boolean
  ): Promise<IPendingTx> {
    if (await isSafeAccount(account)) {
      return this.safe.signAndSendTx(
        account,
        request as SafeTransactionData,
        origin,
        functionSig,
        replace
      )
    } else if (await isErc4337Account(account)) {
      return this.erc4337.signAndSendTx(
        account,
        request,
        origin,
        functionSig,
        replace
      )
    } else {
      return this.basic.signAndSendTx(
        account,
        request,
        origin,
        functionSig,
        replace
      )
    }
  }

  async addPendingTx(
    account: IChainAccount,
    request: TransactionRequest | SafeTransactionData,
    tx:
      | TransactionResponse
      | UserOperationResponse
      | SafeMultisigTransactionResponse,
    origin?: string,
    functionSig?: FunctionFragment,
    replace = true
  ): Promise<IPendingTx> {
    if (await isSafeAccount(account)) {
      return this.safe.addPendingTx(
        account,
        request as SafeTransactionData,
        tx as SafeMultisigTransactionResponse,
        origin,
        functionSig,
        replace
      )
    } else if (await isErc4337Account(account)) {
      return this.erc4337.addPendingTx(
        account,
        request,
        tx as UserOperationResponse,
        origin,
        functionSig,
        replace
      )
    } else {
      return this.basic.addPendingTx(
        account,
        request,
        tx as TransactionResponse,
        origin,
        functionSig,
        replace
      )
    }
  }

  async waitForTx(
    pendingTx: IPendingTx,
    tx?:
      | TransactionResponse
      | UserOperationResponse
      | SafeMultisigTransactionResponse,
    confirmations = 1
  ): Promise<ITransaction | undefined> {
    const account = await WALLET_SERVICE.getChainAccount({
      masterId: pendingTx.masterId,
      index: pendingTx.index,
      networkKind: pendingTx.networkKind,
      chainId: pendingTx.chainId
    })
    if (!account) {
      return
    }

    if (await isSafeAccount(account)) {
      return this.safe.waitForTx(
        pendingTx,
        tx as SafeMultisigTransactionResponse,
        confirmations
      )
    } else if (await isErc4337Account(account)) {
      return this.erc4337.waitForTx(
        pendingTx,
        tx as UserOperationResponse,
        confirmations
      )
    } else {
      return this.basic.waitForTx(
        pendingTx,
        tx as TransactionResponse,
        confirmations
      )
    }
  }

  async fetchTransactions(
    account: IChainAccount,
    type: string
  ): Promise<number | undefined> {
    if (await isSafeAccount(account)) {
      return this.safe.fetchTransactions(account, type)
    } else if (await isErc4337Account(account)) {
      return this.erc4337.fetchTransactions(account, type)
    } else {
      return this.basic.fetchTransactions(account, type)
    }
  }
}

function createEvmTransactionService(): ITransactionService {
  const serviceName = 'evmTransactionService'
  let service
  if (isBackgroundWorker()) {
    service = new EvmTransactionService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
  } else {
    service = SERVICE_WORKER_CLIENT.service<ITransactionService>(
      serviceName,
      // @ts-ignore
      new EvmTransactionServicePartial()
    )
  }
  return service
}

export const EVM_TRANSACTION_SERVICE = createEvmTransactionService()

export function useTransactionDescription(
  network?: INetwork,
  tx?: TransactionRequest
) {
  const provider = useEtherScanProvider(network)

  const { value: description } = useAsync(async () => {
    const contract = tx?.to
    const data = tx?.data?.length ? hexlify(tx.data) : undefined
    if (!provider || !contract || !data) {
      return
    }
    let iface
    try {
      iface = await provider.getAbi(contract)
    } catch {
      return
    }
    return iface.parseTransaction({ data })
  }, [provider, tx])

  const _signature = useEvmFunctionSignature(tx?.data)
  const signature = description?.functionFragment || _signature

  return {
    signature,
    description
  }
}
