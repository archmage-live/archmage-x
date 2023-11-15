import { FunctionFragment } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import {
  SafeMultisigTransactionResponse,
  SafeTransactionData
} from '@safe-global/safe-core-sdk-types'
import assert from 'assert'
import stableHash from 'stable-hash'

import { DB } from '~lib/db'
import { getSafeService, getSafeTxHash } from '~lib/safe'
import { IChainAccount, IPendingTx, ITransaction } from '~lib/schema'
import { getEvmSignatureFrom4Bytes } from '~lib/services/datasource/4byte'
import { NETWORK_SERVICE } from '~lib/services/network'
import { EvmClient } from '~lib/services/provider/evm'

import {
  EvmBasicTransactionService,
  EvmPendingTxInfo,
  EvmTransactionInfo,
  EvmTxType,
  isEvmSafeTransactionResponse
} from './evmService'

export class EvmSafeTransactionService extends EvmBasicTransactionService {
  async signAndSendTx(
    account: IChainAccount,
    request: SafeTransactionData,
    origin?: string,
    functionSig?: FunctionFragment,
    replace?: boolean
  ): Promise<IPendingTx> {
    // TODO: implement replacement tx for safe
    throw new Error('not implemented')
  }

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

    const provider = await EvmClient.from(network.chainId)
    const safeService = getSafeService(provider, network.chainId)

    {
      const pendingTxs = []

      const limit = 100
      for (let page = 0; ; page += 1) {
        const rep = await safeService.getPendingTransactions(
          account.address,
          undefined,
          {
            limit,
            offset: page * limit
          }
        )

        if (!rep.results.length) {
          break
        }

        pendingTxs.push(...rep.results)

        if (!rep.next) {
          break
        }
      }

      const existingPendingTxs = await this.getPendingTxs(account)
      const existingPendingMap = new Map(
        existingPendingTxs.map((pendingTx) => [pendingTx.nonce, pendingTx])
      )

      const bulkAdd: IPendingTx[] = []
      const bulkUpdate: IPendingTx[] = []
      for (const pendingTx of pendingTxs) {
      }

      await DB.transaction('rw', [DB.pendingTxs], async () => {
        if (bulkAdd.length) {
          await DB.pendingTxs.bulkAdd(bulkAdd)
        }

        if (bulkUpdate.length) {
          await DB.pendingTxs.bulkPut(bulkUpdate)
        }
      })
    }

    const bulkAdd: ITransaction[] = []
    const bulkUpdate: ITransaction[] = []
    const confirmedPending: [IPendingTx, SafeMultisigTransactionResponse][] = []

    let page = -1
    const limit = 100
    while (true) {
      page += 1

      const rep = await safeService.getAllTransactions(account.address, {
        // only executed and non-queued txs
        executed: true,
        queued: false,
        limit,
        offset: page * limit
      })

      const transactions = rep.results.filter(
        (tx) => typeof tx.blockNumber === 'number'
      )
      if (!transactions.length) {
        break
      }

      if (transactions[0].blockNumber! <= lastBlock) {
        // no new txs
        break
      }

      const txQuery = []
      for (const tx of transactions) {
        const txHash = getSafeTxHash(tx)
        if (!txHash) {
          continue
        }
        txQuery.push([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          type,
          BigNumber.from(tx.blockNumber!).toNumber(), // use blockNumber as index1
          txHash! // use txHash as index2
        ])
      }

      const existingTxs = await DB.transactions
        .where(
          '[masterId+index+networkKind+chainId+address+type+index1+index2]'
        )
        .anyOf(txQuery)
        .toArray()
      const existingTxsMap = new Map(
        existingTxs.map((tx) => [tx.index2 as string, tx])
      ) // txHash -> tx

      const existingPendingTxs = await this.getPendingTxs(account)
      const existingPendingMap = new Map(
        existingPendingTxs.map((pendingTx) => [pendingTx.nonce, pendingTx])
      )

      for (const tx of transactions) {
        const txHash = getSafeTxHash(tx)
        if (!txHash) {
          continue
        }

        let pendingTxInfo: EvmPendingTxInfo | undefined
        if (tx.txType === 'MULTISIG_TRANSACTION') {
          const pendingTx = existingPendingMap.get(tx.nonce)
          if (pendingTx) {
            pendingTxInfo = pendingTx.info
            confirmedPending.push([pendingTx, tx])
          }
        }

        const existing = existingTxsMap.get(txHash)
        if (!existing) {
          let functionSig
          if (tx.data) {
            functionSig = await getEvmSignatureFrom4Bytes(tx.data)
          }

          bulkAdd.push(
            this.newTransaction({
              account,
              type,
              tx,
              request: pendingTxInfo?.request,
              origin: pendingTxInfo?.origin,
              functionSig
            })
          )
        } else {
          const info = existing.info as EvmTransactionInfo
          assert(isEvmSafeTransactionResponse(info.tx))
          if (stableHash(info.tx) !== stableHash(tx)) {
            info.tx = tx

            if (!info.functionSig && tx.data) {
              info.functionSig = await getEvmSignatureFrom4Bytes(tx.data)
            }

            bulkUpdate.push(existing)
          }
        }
      }

      if (!rep.next) {
        break
      }
    }

    if (!bulkAdd.length && !bulkUpdate.length) {
      return
    }

    await DB.transaction('rw', [DB.transactions], async () => {
      if (bulkAdd.length) {
        await DB.transactions.bulkAdd(bulkAdd)
      }

      if (bulkUpdate.length) {
        await DB.transactions.bulkPut(bulkUpdate)
      }

      // add new cursor
      {
        const index1 = bulkAdd.length ? bulkAdd[0].index1 : bulkUpdate[0].index1
        const index2 = bulkAdd.length ? bulkAdd[0].index2 : bulkUpdate[0].index2
        const cursorTx = await DB.transactions
          .where({
            masterId: account.masterId,
            index: account.index,
            networkKind: account.networkKind,
            chainId: account.chainId,
            address: account.address,
            type,
            index1,
            index2
          })
          .first()
        assert(cursorTx)

        const info = cursorTx.info as EvmTransactionInfo
        info.fetchedCursor = true
        await DB.transactions.update(cursorTx.id, { info })
      }

      // delete old cursor
      if (lastCursorTx) {
        const info = lastCursorTx.info as EvmTransactionInfo
        delete info.fetchedCursor
        await DB.transactions.update(lastCursorTx.id, { info })
      }
    })

    for (const [pendingTx, tx] of confirmedPending) {
      await this.checkPendingTx(pendingTx, tx)
    }

    return bulkAdd.length + bulkUpdate.length
  }
}
