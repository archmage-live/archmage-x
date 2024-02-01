import { arrayify, hexlify } from '@ethersproject/bytes'
import {
  ConfirmedSignatureInfo,
  ParsedTransactionWithMeta,
  PublicKey,
  VersionedTransaction,
  VersionedTransactionResponse
} from '@solana/web3.js'
import assert from 'assert'
import bs58 from 'bs58'

import { DB } from '~lib/db'
import { isBackgroundWorker } from '~lib/detect'
import { NetworkKind } from '~lib/network'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IChainAccount, IPendingTx, ITransaction } from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import { getSolanaClient } from '~lib/services/provider/solana/client'

import { ITransactionService } from '.'
import { BaseTransactionService } from './baseService'

export interface SolanaPendingTxInfo {
  tx: string // serialized VersionedTransaction

  origin?: string
}

export interface SolanaTransactionInfo {
  txResponse: [VersionedTransactionResponse, ParsedTransactionWithMeta]

  tx?: string // serialized VersionedTransaction; only exists for local sent transaction

  origin?: string // only exists for local sent transaction
}

// @ts-ignore
class SolanaTransactionServicePartial
  extends BaseTransactionService
  implements ITransactionService {}

export class SolanaTransactionService extends SolanaTransactionServicePartial {
  async addPendingTx(
    account: IChainAccount,
    tx: VersionedTransaction,
    origin?: string
  ) {
    assert(account.address)

    const pendingTx = {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      nonce: Date.now(), // since no nonce for Solana
      hash: bs58.encode(tx.signatures[0]), // tx id is the first (payer) signature
      info: {
        tx: hexlify(tx.serialize()),
        origin
      } as SolanaPendingTxInfo
    } as IPendingTx

    pendingTx.id = await DB.pendingTxs.add(pendingTx)

    this.checkPendingTx(pendingTx).finally()

    return pendingTx
  }

  async waitForTx(pendingTx: IPendingTx): Promise<ITransaction | undefined> {
    if (!(await this.getPendingTx(pendingTx.id))) {
      return
    }

    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.SOLANA,
      chainId: pendingTx.chainId
    })
    if (!network) {
      await DB.pendingTxs.delete(pendingTx.id)
      return
    }

    const info = pendingTx.info as SolanaPendingTxInfo
    VersionedTransaction.deserialize(arrayify(info.tx))

    const client = getSolanaClient(network)

    // TODO: confirm with TransactionConfirmationStrategy
    const status = (await client.confirmTransaction(pendingTx.hash!)).value

    if (status.err) {
      console.log(
        `delete pending tx: ${pendingTx.id} (${JSON.stringify(status)})`
      )
      await DB.pendingTxs.delete(pendingTx.id)
      return
    }

    const tx = await client.getTransaction(pendingTx.hash!, {
      maxSupportedTransactionVersion: 0
    })
    const parsedTx = await client.getParsedTransaction(pendingTx.hash!, {
      maxSupportedTransactionVersion: 0
    })
    if (!tx || !parsedTx) {
      console.log(`delete pending tx: ${pendingTx.id}`)
      await DB.pendingTxs.delete(pendingTx.id)
      return
    }

    let transaction = {
      masterId: pendingTx.masterId,
      index: pendingTx.index,
      networkKind: pendingTx.networkKind,
      chainId: pendingTx.chainId,
      address: pendingTx.address,
      type: '',
      index1: tx.slot,
      index2: pendingTx.hash,
      info: {
        txResponse: [tx, parsedTx],
        tx: info.tx,
        origin: info.origin
      } as SolanaTransactionInfo
    } as ITransaction

    await DB.transaction('rw', [DB.pendingTxs, DB.transactions], async () => {
      const existingTx = await DB.transactions
        .where({
          masterId: pendingTx.masterId,
          index: pendingTx.index,
          networkKind: pendingTx.networkKind,
          chainId: pendingTx.chainId,
          address: pendingTx.address,
          type: '',
          index1: tx.slot,
          index2: pendingTx.hash
        })
        .first()
      if (!existingTx) {
        transaction.id = await DB.transactions.add(transaction)
      } else {
        transaction = existingTx
      }

      if (!(await this.getPendingTx(pendingTx.id))) {
        return
      }
      await DB.pendingTxs.delete(pendingTx.id)
    })

    await this.notifyTransaction(network, transaction)

    return transaction
  }

  async fetchTransactions(
    account: IChainAccount,
    type: string
  ): Promise<number | undefined> {
    assert(type === '')
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

    const client = getSolanaClient(network)

    const lastTx = await DB.transactions
      .where('[masterId+index+networkKind+chainId+address+type]')
      .equals([
        account.masterId,
        account.index,
        account.networkKind,
        account.chainId,
        account.address!,
        type
      ])
      .last()
    const lastSlot = lastTx?.index1 as number | undefined

    const getAndPersistTxs = async (sigs: ConfirmedSignatureInfo[]) => {
      const signatures = sigs.map((sig) => sig.signature)
      const txs = await client.getTransactions(signatures, {
        maxSupportedTransactionVersion: 0
      })
      const parsedTxs = await client.getParsedTransactions(signatures, {
        maxSupportedTransactionVersion: 0
      })
      assert(txs.length === sigs.length && parsedTxs.length === sigs.length)

      const txResponses: [
        VersionedTransactionResponse,
        ParsedTransactionWithMeta
      ][] = []
      const txQuery = []
      for (let i = 0; i < sigs.length; i++) {
        const sig = sigs[i]
        const tx = txs[i]
        const parsedTx = parsedTxs[i]
        if (tx && parsedTx) {
          txResponses.push([tx, parsedTx])

          txQuery.push([
            account.masterId,
            account.index,
            account.networkKind,
            account.chainId,
            account.address!,
            type,
            sig.slot,
            sig.signature
          ])
        }
      }

      const existingTxs = await DB.transactions
        .where(
          '[masterId+index+networkKind+chainId+address+type+index1+index2]'
        )
        .anyOf(txQuery)
        .toArray()
      const existingTxsSet = new Set(existingTxs.map((tx) => tx.index2))

      const addTxs: ITransaction[] = []
      const pendingTxsForTxsQuery = []
      for (const [tx, parsedTx] of txResponses) {
        // tx id is the first (payer) signature
        const signature = tx.transaction.signatures[0]
        // deduplicate for existing txs
        if (existingTxsSet.has(signature)) {
          continue
        }

        addTxs.push({
          masterId: account.masterId,
          index: account.index,
          networkKind: account.networkKind,
          chainId: account.chainId,
          address: account.address!,
          type,
          index1: tx.slot, // block number
          index2: signature, // transaction hash
          info: {
            txResponse: [tx, parsedTx]
          } as SolanaTransactionInfo
        } as ITransaction)

        pendingTxsForTxsQuery.push([
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address!,
          signature // transaction hash
        ])
      }

      const existingPendingTxsForTxs = await DB.pendingTxs
        .where('[masterId+index+networkKind+chainId+address+hash]')
        .anyOf(pendingTxsForTxsQuery)
        .toArray()
      const existingPendingTxsForTxsMap = new Map(
        existingPendingTxsForTxs.map((tx) => [
          tx.hash,
          tx.info as SolanaPendingTxInfo
        ])
      )
      addTxs.forEach((tx) => {
        const info = tx.info as SolanaTransactionInfo
        // tx id is the first (payer) signature
        const signature = info.txResponse[0].transaction.signatures[0]
        const pendingTxInfo = existingPendingTxsForTxsMap.get(signature)
        info.tx = pendingTxInfo?.tx
        info.origin = pendingTxInfo?.origin
      })

      const deletePendingTxs = existingPendingTxsForTxs.map((tx) => tx.id)

      await DB.transaction('rw', [DB.pendingTxs, DB.transactions], async () => {
        if (deletePendingTxs.length) {
          await DB.pendingTxs.bulkDelete(deletePendingTxs)
        }
        if (addTxs.length) {
          await DB.transactions.bulkAdd(addTxs)
        }
      })
    }

    // try our best to get all transactions until the last slot
    let beforeSig: string | undefined = undefined
    while (true) {
      let sigs: ConfirmedSignatureInfo[] = await client.getSignaturesForAddress(
        new PublicKey(account.address),
        {
          before: beforeSig,
          limit: 1000
        }
      )

      sigs = sigs.filter(
        (sig) => lastSlot === undefined || sig.slot >= lastSlot
      )
      if (!sigs.length) {
        // no more transactions
        break
      }

      beforeSig = sigs[sigs.length - 1].signature

      await getAndPersistTxs(sigs)
    }
  }
}

function createSolanaTransactionService(): ITransactionService {
  const serviceName = 'solanaTransactionService'
  let service
  if (isBackgroundWorker()) {
    service = new SolanaTransactionService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
  } else {
    service = SERVICE_WORKER_CLIENT.service<ITransactionService>(
      serviceName,
      // @ts-ignore
      new SolanaTransactionServicePartial()
    )
  }
  return service
}

export const SOLANA_TRANSACTION_SERVICE = createSolanaTransactionService()
