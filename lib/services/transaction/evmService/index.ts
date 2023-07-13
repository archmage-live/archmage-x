import { FunctionFragment } from '@ethersproject/abi'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { hexlify } from '@ethersproject/bytes'
import { TransactionRequest } from '@ethersproject/providers'
import { useAsync } from 'react-use'

import { isBackgroundWorker } from '~lib/detect'
import { isErc4337Account } from '~lib/erc4337'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IChainAccount, INetwork, IPendingTx, ITransaction } from '~lib/schema'
import { useEtherScanProvider } from '~lib/services/datasource/etherscan'
import { useEvmFunctionSignature } from '~lib/services/provider/evm'
import { ITransactionService } from '~lib/services/transaction'
import { WALLET_SERVICE } from '~lib/services/wallet'

import { EvmErc4337TransactionService } from './evmErc4337Service'
import {
  EvmBasicTransactionService,
  EvmTransactionServicePartial
} from './evmService'

export * from './evmService'
export * from './evmErc4337Service'

export class EvmTransactionService extends EvmTransactionServicePartial {
  private basic = new EvmBasicTransactionService()
  private erc4337 = new EvmErc4337TransactionService()

  async signAndSendTx(
    account: IChainAccount,
    request: TransactionRequest,
    origin?: string,
    functionSig?: FunctionFragment,
    replace?: boolean
  ): Promise<IPendingTx> {
    if (!(await isErc4337Account(account))) {
      return this.basic.signAndSendTx(
        account,
        request,
        origin,
        functionSig,
        replace
      )
    } else {
      return this.erc4337.signAndSendTx(
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
    request: TransactionRequest,
    tx: TransactionResponse,
    origin?: string,
    functionSig?: FunctionFragment,
    replace = true
  ): Promise<IPendingTx> {
    if (!(await isErc4337Account(account))) {
      return this.basic.addPendingTx(
        account,
        request,
        tx,
        origin,
        functionSig,
        replace
      )
    } else {
      return this.erc4337.addPendingTx(
        account,
        request,
        tx,
        origin,
        functionSig,
        replace
      )
    }
  }

  async waitForTx(
    pendingTx: IPendingTx,
    tx?: TransactionResponse,
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

    if (!(await isErc4337Account(account))) {
      return this.basic.waitForTx(pendingTx, tx, confirmations)
    } else {
      return this.erc4337.waitForTx(pendingTx, tx, confirmations)
    }
  }

  async fetchTransactions(
    account: IChainAccount,
    type: string
  ): Promise<number | undefined> {
    if (!(await isErc4337Account(account))) {
      return this.basic.fetchTransactions(account, type)
    } else {
      return this.erc4337.fetchTransactions(account, type)
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
