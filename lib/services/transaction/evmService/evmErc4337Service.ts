import { FunctionFragment } from '@ethersproject/abi'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { getAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import { TransactionRequest } from '@ethersproject/providers'
import assert from 'assert'
import PQueue from 'p-queue'
import stableHash from 'stable-hash'

import { DB } from '~lib/db'
import { Erc4337CallDataDecoder } from '~lib/erc4337/callData'
import { IChainAccount, IPendingTx, ITransaction } from '~lib/schema'
import { getEvmSignatureFrom4Bytes } from '~lib/services/datasource/4byte'
import { JIFFYSCAN_API, UserOp } from '~lib/services/datasource/jiffyscan'
import { NETWORK_SERVICE } from '~lib/services/network'
import { UserOperationResponse } from '~lib/services/provider/evm'
import { WALLET_SERVICE } from '~lib/services/wallet'

import {
  EvmBasicTransactionService,
  EvmPendingTxInfo,
  EvmTransactionInfo,
  EvmTxType,
  isEvmUserOperationResponse
} from './evmService'

export class EvmErc4337TransactionService extends EvmBasicTransactionService {
  async signAndSendTx(
    account: IChainAccount,
    request: TransactionRequest,
    origin?: string,
    functionSig?: FunctionFragment,
    replace?: boolean
  ): Promise<IPendingTx> {
    // TODO: implement replacement tx for erc4337
    throw new Error('not implemented.')
  }

  async addPendingTx(
    account: IChainAccount,
    request: TransactionRequest,
    tx: TransactionResponse | UserOperationResponse,
    origin?: string,
    functionSig?: FunctionFragment,
    replace = true
  ): Promise<IPendingTx> {
    assert(account.address)
    assert(isEvmUserOperationResponse(tx))

    const wallet = await WALLET_SERVICE.getWallet(account.masterId)
    const subWallet = await WALLET_SERVICE.getSubWallet({
      masterId: account.masterId,
      index: account.index
    })
    assert(wallet && subWallet)

    const accountType =
      wallet.info.erc4337?.type || subWallet.info.erc4337?.type
    assert(accountType)

    if (tx.callData) {
      const decoder = new Erc4337CallDataDecoder(accountType, account.address)
      const decoded = decoder.decodeExecute(tx.callData)

      if (decoded) {
        tx.decodedCallData = [decoded]

        if (decoded.data && !functionSig) {
          functionSig = await getEvmSignatureFrom4Bytes(decoded.data)
        }
      }
    }

    return super.addPendingTx(
      account,
      request,
      tx,
      origin,
      functionSig,
      replace
    )
  }

  async waitForTx(
    pendingTx: IPendingTx,
    tx?: TransactionResponse | UserOperationResponse,
    confirmations = 1
  ): Promise<ITransaction | undefined> {
    return super.waitForTx(pendingTx, tx, confirmations)
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

    assert(type === EvmTxType.UserOp)

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
    const confirmedPending: [IPendingTx, UserOperationResponse][] = []

    let page = -1
    const limit = 100
    while (true) {
      page += 1

      const activity = await JIFFYSCAN_API.getAddressActivity(
        network,
        account.address,
        page * limit,
        limit
      )
      if (!activity) {
        return
      }

      const userOps = activity.accountDetail.userOps
      if (!userOps.length) {
        // no more userOps
        break
      }

      const [latestUserOperation, latestUserOp] =
        (await JIFFYSCAN_API.getUserOp(network, userOps[0].userOpHash)) || []

      if (
        !latestUserOperation ||
        !latestUserOp ||
        BigNumber.from(latestUserOperation.blockNumber || 0).toNumber() <=
          lastBlock
      ) {
        // no new userOps
        break
      }

      // TODO: since jiffyscan doesn't support batch query of UserOperationResponse, we have to query one by one
      const queue = new PQueue({ concurrency: 3 })
      const transactions = (
        await queue.addAll(
          userOps.map(
            (userOp, index) => async () =>
              index === 0
                ? [latestUserOperation, latestUserOp] // fetched above
                : await JIFFYSCAN_API.getUserOp(network, userOp.userOpHash)
          )
        )
      ).filter(Boolean) as [UserOperationResponse, UserOp][]

      const txQuery = []
      for (const [tx] of transactions) {
        txQuery.push([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          type,
          BigNumber.from(tx.blockNumber).toNumber(), // use blockNumber as index1
          tx.hash // use userOpHash as index2
        ])
      }

      const existingTxs = await DB.transactions
        .where(
          '[masterId+index+networkKind+chainId+address+type+index1+index2]'
        )
        .anyOf(txQuery)
        .toArray()
      const existingTxsSet = new Map(
        existingTxs.map((tx) => [tx.index2 as string, tx])
      ) // userOpHash -> tx

      const pendingTxs = await this.getPendingTxs(account)
      const existingPendingMap = new Map(
        pendingTxs.map((pendingTx) => [pendingTx.nonce, pendingTx])
      )

      for (const [tx, jiffyscanUserOp] of transactions) {
        let pendingTxInfo: EvmPendingTxInfo | undefined
        if (getAddress(tx.sender) === account.address) {
          const pendingTx = existingPendingMap.get(Number(tx.nonce))
          if (pendingTx) {
            pendingTxInfo = pendingTx.info
            confirmedPending.push([pendingTx, tx])
          }
        }

        const existing = existingTxsSet.get(tx.hash)
        if (!existing) {
          const decoded = tx.decodedCallData?.at(0)
          let functionSig
          if (decoded?.data) {
            functionSig = await getEvmSignatureFrom4Bytes(decoded.data)
          }

          bulkAdd.push(
            this.newTransaction({
              account,
              type,
              tx,
              jiffyscanUserOp,
              request: pendingTxInfo?.request,
              origin: pendingTxInfo?.origin,
              functionSig
            })
          )
        } else {
          const info = existing.info as EvmTransactionInfo
          assert(isEvmUserOperationResponse(info.tx))
          if (
            info.tx.blockNumber == null ||
            !info.jiffyscanUserOp ||
            info.jiffyscanUserOp.success !== jiffyscanUserOp.success ||
            stableHash(info.tx.decodedCallData) !==
              stableHash(tx.decodedCallData)
          ) {
            info.tx = tx
            info.jiffyscanUserOp = jiffyscanUserOp

            const decoded = tx.decodedCallData?.at(0)
            if (!info.functionSig && decoded?.data) {
              info.functionSig = await getEvmSignatureFrom4Bytes(decoded.data)
            }

            bulkUpdate.push(existing)
          }
        }
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
