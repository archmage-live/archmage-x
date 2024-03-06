import {
  Block,
  PrivateKey,
  RecordCiphertext,
  RecordPlaintext,
  Transaction,
  TransactionModel,
  AleoNetworkClient as _AleoNetworkClient
} from '@aleohq/sdk'
import assert from 'assert'

import { fetchJson } from '~lib/fetch'
import { INetwork } from '~lib/schema'

export class AleoNetworkClient extends _AleoNetworkClient {
  constructor(network: INetwork) {
    // TODO
    const host = 'https://vm.aleo.org/api'
    super(host)
  }

  override async submitTransaction(
    transaction: Transaction | string
  ): Promise<string> {
    return transaction instanceof Transaction
      ? transaction.toString()
      : transaction
  }

  async sendTransaction(transaction: Transaction | string): Promise<string> {
    return (await super.submitTransaction(transaction)) as string
  }

  async findAllUnspentRecords(
    program: string,
    startHeight: number,
    endHeight?: number,
    privateKey?: string | PrivateKey,
    nonces?: Set<string>
  ) {
    const records = new Array<RecordPlaintext>()

    let resolvedPrivateKey: PrivateKey
    // Ensure a private key is present to find owned records
    if (!privateKey) {
      assert(this.account, 'private key required')
      resolvedPrivateKey = this.account._privateKey
    } else {
      resolvedPrivateKey =
        privateKey instanceof PrivateKey
          ? privateKey
          : PrivateKey.from_string(privateKey)
    }
    const viewKey = resolvedPrivateKey.to_view_key()

    const latestHeight = (await this.getLatestHeight()) as number
    let end = endHeight && endHeight <= latestHeight ? endHeight : latestHeight
    assert(
      startHeight <= end,
      'start height must be less than or equal to end height'
    )

    // Iterate through blocks in reverse order in chunks of 50
    let failures = 0
    while (end > startHeight) {
      let start = end - 50
      if (start < startHeight) {
        start = startHeight
      }

      try {
        const blocks = (await this.getBlockRange(start, end)) as Block[]
        end = start

        for (const block of blocks) {
          console.log(`block ${block.header.metadata.height}`)
          const transactions = block.transactions
          if (!transactions) {
            continue
          }

          for (const confirmedTransaction of transactions) {
            if (confirmedTransaction.type !== 'execute') {
              continue
            }

            const transaction = confirmedTransaction.transaction
            if (!transaction.execution.transitions) {
              continue
            }

            for (const transition of transaction.execution.transitions) {
              // Only search for unspent records in specific program
              if (transition.program !== program) {
                continue
              }

              if (!transition.outputs) {
                continue
              }

              for (const output of transition.outputs) {
                if (output.type !== 'record') {
                  continue
                }

                const record = RecordCiphertext.fromString(output.value)
                if (!record.isOwner(viewKey)) {
                  continue
                }

                const recordPlaintext = record.decrypt(viewKey)
                const nonce = recordPlaintext.nonce()
                if (nonces?.has(nonce)) {
                  continue
                }

                const serialNumber = recordPlaintext.serialNumberString(
                  resolvedPrivateKey,
                  transition.program,
                  'credits' // TODO: get record name
                )

                try {
                  // Attempt to see if the serial number is spent
                  // TODO: distinguish different errors
                  await this.getTransitionId(serialNumber)
                } catch {
                  records.push(recordPlaintext)
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn(`fetching blocks in [${start}, ${end}]:`, err)

        failures += 1
        if (failures > 10) {
          console.warn('10 failures fetching records reached')
          break
        }
      }
    }

    return records
  }

  async getPublicTransactionsForAddress(
    address: string,
    startHeight: number, // >=
    endHeight: number, // <
    page: number, // from 0
    limit: number = 100000
  ): Promise<TransactionModel[]> {
    const rep = (await fetchJson(
      'https://testnet3.aleorpc.com',
      JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        method: 'getPublicTransactionsForAddress',
        params: {
          address,
          start: startHeight,
          end: endHeight,
          page,
          transactionsPerRequest: limit
        }
      })
    )) as {
      jsonrpc: '2.0'
      id: 0
      result: { transaction_id: string }[]
    }

    const transactions = []
    for (const txId of rep.result) {
      const tx = (await this.getTransaction(
        txId.transaction_id
      )) as TransactionModel
      transactions.push(tx)
    }

    return transactions
  }
}
