import assert from 'assert'
import * as bitcoin from 'bitcoinjs-lib'
import { ethErrors } from 'eth-rpc-errors'
import PQueue from 'p-queue'

import { BtcChainInfo } from '~lib/network/btc'
import { IChainAccount, INetwork, Utxo } from '~lib/schema'
import { EsploraApi } from '~lib/services/datasource/esplora'
import { NETWORK_SERVICE } from '~lib/services/network'
import { Provider, TransactionPayload } from '~lib/services/provider'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { getSigningWallet } from '~lib/wallet'

import { BtcSubAccount, BtcTxParams } from './types'

const coinSelect = require('coinselect')

export class BtcProvider implements Provider {
  api: EsploraApi

  constructor(private network: INetwork) {
    const info = network.info as BtcChainInfo
    this.api = new EsploraApi(info.rpc[0])
  }

  async isOk(): Promise<boolean> {
    try {
      await this.api.getBlocksTipHeight()
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  isContract(address: string): Promise<boolean> {
    throw new Error('not implemented')
  }

  getNextNonce(account: IChainAccount, tag?: string | number): Promise<number> {
    throw new Error('not implemented')
  }

  private async getUtxosByAddress(address: string) {
    const utxos = (
      await this.api.getAddressTxsUtxo({
        address
      })
    ).filter((utxo) => utxo.status.confirmed)
    return {
      utxos,
      balance: utxos.reduce((sum, utxo) => sum + utxo.value, 0)
    }
  }

  async getBalance(
    accountOrAddress: IChainAccount | string
  ): Promise<string | undefined> {
    if (typeof accountOrAddress === 'object') {
      if (!accountOrAddress.address) {
        return
      }

      if (!accountOrAddress.info.subAccounts?.length) {
        const { utxos, balance } = await this.getUtxosByAddress(
          accountOrAddress.address
        )

        accountOrAddress.info.utxos = utxos.map(
          ({ txid, vout, value }) => ({ txid, vout, value } as Utxo)
        )

        await WALLET_SERVICE.updateChainAccount(accountOrAddress)

        return balance.toString()
      }

      const queue = new PQueue({ concurrency: 3 })
      const balances = await queue.addAll(
        accountOrAddress.info.subAccounts.flat().map((acc) => async () => {
          const { utxos, balance } = await this.getUtxosByAddress(acc.address)

          acc.utxos = utxos.map(
            ({ txid, vout, value }) => ({ txid, vout, value } as Utxo)
          )

          return balance
        })
      )

      await WALLET_SERVICE.updateChainAccount(accountOrAddress)

      return balances.reduce((sum, balance) => sum + balance, 0).toString()
    } else {
      if (!accountOrAddress) {
        return
      }

      return (await this.getUtxosByAddress(accountOrAddress)).toString()
    }
  }

  async getBalances(
    accountsOrAddresses: IChainAccount[] | string[]
  ): Promise<(string | undefined)[]> {
    const queue = new PQueue({ concurrency: 3 })
    return await queue.addAll(
      accountsOrAddresses.map((acc) => () => this.getBalance(acc))
    )
  }

  async estimateGasPrice(
    account: IChainAccount
  ): Promise<Record<string, number>> {
    return await this.api.getFeeEstimates()
  }

  async estimateGas(account: IChainAccount, tx: any): Promise<null> {
    return null
  }

  async estimateGasFee(account: IChainAccount, tx: any): Promise<null> {
    return null
  }

  async populateTransaction(
    account: IChainAccount,
    transaction: any
  ): Promise<TransactionPayload> {
    throw new Error('not implemented')
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
  ): Promise<string> {
    return await this.api.postTx(signedTransaction)
  }

  signMessage(account: IChainAccount, message: any): Promise<any> {
    throw new Error('not implemented')
  }

  getTypedData(typedData: any): Promise<any> {
    throw new Error('not implemented')
  }

  signTypedData(account: IChainAccount, typedData: any): Promise<any> {
    throw new Error('not implemented')
  }

  async isSignable(account: IChainAccount): Promise<boolean> {
    return !!(await getSigningWallet(account))
  }

  async buildBtcTransfer(account: IChainAccount, params: BtcTxParams) {
    assert(account.address)

    const info = account.info

    // cached balance is preferred
    if (!info.utxos && !info.subAccounts?.flat().some((acc) => !!acc.utxos)) {
      // if no cache, fetch balance
      await this.getBalance(account)
    }

    const utxos =
      info.utxos ||
      info
        .subAccounts!.flat()
        .map((acc) =>
          acc.utxos!.map((utxo) => ({
            ...utxo,
            subAccount: acc
          }))
        )
        .flat()

    const { inputs, outputs, fee } = coinSelect(
      utxos,
      [{ address: params.to, value: params.value }],
      params.feeRate
    )

    if (!inputs || !outputs) {
      return
    }

    const network = await NETWORK_SERVICE.getNetwork({
      kind: account.networkKind,
      chainId: account.chainId
    })
    assert(network)

    const psbt = new bitcoin.Psbt({
      network: (network.info as BtcChainInfo).network
    })

    const subAccounts = new Map<string, BtcSubAccount>()

    for (const input of inputs) {
      const tx = await this.api.getTx({ txid: input.txId })
      const txRaw = await this.api.getTxRaw({ txid: input.txId })
      const vout = tx.vout[input.vout]

      const witnessTypes: typeof vout.scriptpubkey_type[] = [
        'v0_p2wpkh',
        'v0_p2wsh',
        'v1_p2tr'
      ]
      const isWitness = witnessTypes.includes(vout.scriptpubkey_type)

      psbt.addInput({
        hash: input.txId,
        index: input.vout,
        nonWitnessUtxo: !isWitness ? Buffer.from(txRaw) : undefined,
        witnessUtxo: isWitness
          ? {
              script: Buffer.from(vout.scriptpubkey, 'hex'),
              value: vout.value
            }
          : undefined
      })

      params.inputTxs.push(Buffer.from(txRaw).toString('hex'))

      const acc = input.subAccount
      if (acc) {
        subAccounts.set(acc.address, {
          changeIndex: acc.changeIndex,
          addressIndex: acc.addressIndex,
          publicKey: acc.publicKey,
          address: acc.address
        })
      }
    }

    for (const output of outputs) {
      // output for change may have been added that we need to
      // provide an output address/script for
      if (!output.address) {
        if (info.subAccounts?.length) {
          // random choice among all the change addresses
          const randomIndex = Math.floor(
            Math.random() * info.subAccounts[1].length
          )
          output.address = info.subAccounts[1][randomIndex].address
        } else {
          output.address = account.address
        }
      }

      psbt.addOutput({
        address: output.address,
        value: output.value
      })
    }

    params.subAccounts = Array.from(subAccounts.values())
    params.fee = fee
    params.psbt = psbt.toHex()
  }
}
