import { BigNumber } from '@ethersproject/bignumber'
import assert from 'assert'

import { IChainAccount, IPendingTx, ITransaction } from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'

import {
  EvmBasicTransactionService,
  EvmTransactionInfo,
  EvmTxType
} from './evmService'

export class EvmSafeTransactionService extends EvmBasicTransactionService {
  async fetchTransactions(
    account: IChainAccount,
    type: string
  ): Promise<number | undefined> {
    if (!account.address) {
      return
    }

    const network = await NETWORK_SERVICE.getNetwork({
      kind: account.networkKind,
      chainId: account.chainId
    })
    if (!network) {
      return
    }

    assert(type === EvmTxType.NORMAL)

    const lastCursorTx = await this._findCursorForFetchTransactions(
      account,
      type
    )
    const lastBlock = lastCursorTx
      ? BigNumber.from(
          (lastCursorTx.info as EvmTransactionInfo).tx.blockNumber!
        ).toNumber()
      : 0

    const bulkAdd: ITransaction[] = []
    const bulkUpdate: ITransaction[] = []
    const confirmedPending: [IPendingTx][] = []
  }
}
