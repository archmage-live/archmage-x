import { sha256 } from '@cosmjs/crypto'
import { toHex } from '@cosmjs/encoding'
import assert from 'assert'
import { TxResponse } from 'cosmjs-types/cosmos/base/abci/v1beta1/abci'
import { AuthInfo, Tx, TxBody, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { NetworkKind } from '~lib/network'
import { CosmAppChainInfo } from '~lib/network/cosm'
import { pubkeyToAddress } from '~lib/network/cosm/amino'
import { Events } from '~lib/network/cosm/modules/tx/queries'
import { decodePubkey } from '~lib/network/cosm/proto-signing'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IChainAccount, IPendingTx, ITransaction } from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import { getCosmClient } from '~lib/services/provider/cosm/client'
import { stall } from '~lib/util'

import { ITransactionService, TransactionInfo } from '.'
import { BaseTransactionService } from './baseService'

export interface CosmPendingTxInfo {
  tx: Tx

  origin?: string // only exists for local sent transaction
}

export interface CosmTransactionInfo {
  tx: Tx

  txResponse: TxResponse

  origin?: string // only exists for local sent transaction
}

export function getCosmTransactionInfo(
  transaction: IPendingTx | ITransaction
): TransactionInfo {
  const info = transaction.info as CosmPendingTxInfo | CosmTransactionInfo
  const tx = info.tx

  return {} as TransactionInfo
}

// @ts-ignore
class CosmTransactionServicePartial
  extends BaseTransactionService
  implements ITransactionService {}

export class CosmTransactionService extends CosmTransactionServicePartial {
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

    const prefix = (network.info as CosmAppChainInfo).bech32Config
      .bech32PrefixAccAddr

    const client = await getCosmClient(network)
    const queryClient = client.getQueryClient()

    const lastTx = await DB.transactions
      .where('[masterId+index+networkKind+chainId+address+type]')
      .equals([
        account.masterId,
        account.index,
        account.networkKind,
        account.chainId,
        account.address!,
        ''
      ])
      .last()
    const lastBlock = lastTx?.index1

    const filterEvents: Events[] = [
      {
        // almost all
        message: {
          sender: account.address
        }
      },
      {
        // x/bank
        transfer: {
          recipient: account.address
        }
      },
      {
        // ibc transfer
        ibc_transfer: {
          sender: account.address
        }
      },
      {
        // ibc transfer
        ibc_transfer: {
          receiver: account.address
        }
      },
      {
        // ibc transfer
        fungible_token_packet: {
          sender: account.address
        }
      },
      {
        // ibc transfer
        fungible_token_packet: {
          receiver: account.address
        }
      },
      {
        // ibc transfer
        fungible_token_packet: {
          refund_receiver: account.address
        }
      },
      {
        // x/nft
        'cosmos.nft.v1beta1.EventSend': {
          receiver: account.address
        }
      },
      {
        // x/nft
        'cosmos.nft.v1beta1.EventMint': {
          owner: account.address
        }
      },
      {
        // x/nft
        'cosmos.nft.v1beta1.EventBurn': {
          owner: account.address
        }
      }
    ]

    const txMap = new Map<string, [Tx, TxResponse]>()
    const txQuery = []

    for (const events of filterEvents) {
      let page = -1
      const limit = 100

      while (true) {
        page += 1

        const txsEventResponse = await queryClient.tx.getTxsEvent(events, {
          offset: page * limit,
          limit,
          isDesc: true
        })

        if (!txsEventResponse.txResponses.length) {
          break
        }

        for (let i = 0; i < txsEventResponse.txs.length; ++i) {
          const tx = txsEventResponse.txs[i]
          const txResponse = txsEventResponse.txResponses[i]
          assert(tx && txResponse)

          if (
            lastBlock !== undefined &&
            txResponse.height.toNumber() <= lastBlock
          ) {
            continue
          }
          if (txMap.has(txResponse.txhash)) {
            continue
          }
          // we only consider transactions with first signer public key for convenience
          if (!tx.authInfo?.signerInfos.at(0)?.publicKey) {
            continue
          }

          txMap.set(txResponse.txhash, [tx, txResponse])

          txQuery.push([
            account.masterId,
            account.index,
            account.networkKind,
            account.chainId,
            account.address!,
            '',
            txResponse.height.toNumber(),
            txResponse.txhash
          ])
        }
      }
    }

    const existingTxs = await DB.transactions
      .where('[masterId+index+networkKind+chainId+address+type+index1+index2]')
      .anyOf(txQuery)
      .toArray()
    const existingTxsSet = new Set(existingTxs.map((tx) => tx.index2))

    const addTxs: ITransaction[] = []

    for (const [tx, txResponse] of txMap.values()) {
      if (existingTxsSet.has(txResponse.txhash)) {
        continue
      }

      addTxs.push({
        masterId: account.masterId,
        index: account.index,
        networkKind: account.networkKind,
        chainId: account.chainId,
        address: account.address!,
        type: '',
        index1: txResponse.height.toNumber(),
        index2: txResponse.txhash,
        info: {
          tx,
          txResponse
        } as CosmTransactionInfo
      } as ITransaction)
    }

    const pendingTxsForTxsQuery = addTxs
      .filter((tx) => {
        // only first signer of tx
        const signer = pubkeyToAddress(
          decodePubkey(
            (tx.info as CosmTransactionInfo).tx.authInfo!.signerInfos[0]
              .publicKey
          )!,
          prefix
        )
        return signer === account.address
      })
      .map((tx) => [
        account.masterId,
        account.index,
        account.networkKind,
        account.chainId,
        account.address!,
        (
          tx.info as CosmTransactionInfo
        ).tx.authInfo!.signerInfos[0].sequence.toNumber()
      ])
    const existingPendingTxsForTxs = await DB.pendingTxs
      .where('[masterId+index+networkKind+chainId+address+nonce]')
      .anyOf(pendingTxsForTxsQuery)
      .toArray()
    const existingPendingTxsForTxsMap = new Map(
      existingPendingTxsForTxs.map((tx) => [
        tx.nonce,
        (tx.info as CosmPendingTxInfo).origin
      ])
    )
    addTxs.forEach(
      (tx) =>
        ((tx.info as CosmTransactionInfo).origin =
          existingPendingTxsForTxsMap.get(
            (
              tx.info as CosmTransactionInfo
            ).tx.authInfo!.signerInfos[0].sequence.toNumber()
          ))
    )
    const deletePendingTxs = existingPendingTxsForTxs.map((tx) => tx.id)

    await DB.transaction('rw', [DB.pendingTxs, DB.transactions], async () => {
      if (deletePendingTxs.length)
        await DB.pendingTxs.bulkDelete(deletePendingTxs)
      if (addTxs.length) await DB.transactions.bulkAdd(addTxs)
    })
  }

  signAndSendTx(account: IChainAccount, ...args: any[]): Promise<IPendingTx> {
    throw new Error('not implemented')
  }

  async addPendingTx(
    account: IChainAccount,
    tx: Tx,
    origin?: string
  ): Promise<IPendingTx> {
    assert(account.address)
    assert(tx.authInfo!.signerInfos[0])

    const pendingTx = {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      nonce: tx.authInfo!.signerInfos[0].sequence.toNumber(),
      info: {
        tx,
        origin
      } as CosmPendingTxInfo
    } as IPendingTx

    pendingTx.id = await DB.pendingTxs.add(pendingTx)

    this.checkPendingTx(pendingTx).finally()

    return pendingTx
  }

  async waitForTx(
    pendingTx: IPendingTx,
    ...args: any[]
  ): Promise<ITransaction | undefined> {
    if (!(await this.getPendingTx(pendingTx.id))) {
      return
    }

    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.COSM,
      chainId: pendingTx.chainId
    })
    if (!network) {
      await DB.pendingTxs.delete(pendingTx.id)
      return
    }

    const client = await getCosmClient(network)
    const queryClient = client.getQueryClient()

    const info = pendingTx.info as CosmPendingTxInfo
    const tx = info.tx
    const txRaw = TxRaw.fromPartial({
      bodyBytes: TxBody.encode(tx.body!).finish(),
      authInfoBytes: AuthInfo.encode(tx.authInfo!).finish(),
      signatures: tx.signatures
    })
    const txBytes = TxRaw.encode(txRaw).finish()
    const txHash = toHex(sha256(txBytes)).toUpperCase()

    const timeoutMs = 60_000
    const pollIntervalMs = 3_000
    let timedOut = false
    const txPollTimeout = setTimeout(() => {
      timedOut = true
    }, timeoutMs)

    let txResponse: TxResponse | undefined
    try {
      while (true) {
        txResponse = (await queryClient.tx.getTx(txHash)).txResponse
        if (txResponse) {
          break
        }
        await stall(pollIntervalMs)
        if (timedOut) {
          throw new Error(
            `Transaction with ID ${txHash} was submitted but was not yet found on the chain. You might want to check later. There was a wait of ${
              timeoutMs / 1000
            } seconds.`
          )
        }
      }
    } finally {
      clearTimeout(txPollTimeout)
    }

    let transaction = {
      masterId: pendingTx.masterId,
      index: pendingTx.index,
      networkKind: pendingTx.networkKind,
      chainId: pendingTx.chainId,
      address: pendingTx.address,
      type: '',
      index1: txResponse.height.toNumber(),
      index2: txResponse.txhash,
      info: {
        tx,
        txResponse,
        origin: info.origin
      } as CosmTransactionInfo
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
          index1: txResponse!.height.toNumber(),
          index2: txResponse!.txhash
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
}

function createCosmTransactionService(): ITransactionService {
  const serviceName = 'cosmTransactionService'
  let service
  if (ENV.inServiceWorker) {
    service = new CosmTransactionService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
  } else {
    service = SERVICE_WORKER_CLIENT.service<ITransactionService>(
      serviceName,
      // @ts-ignore
      new CosmTransactionServicePartial()
    )
  }
  return service
}

export const COSM_TRANSACTION_SERVICE = createCosmTransactionService()
