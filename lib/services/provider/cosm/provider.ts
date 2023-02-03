import { AminoSignResponse, StdSignDoc } from '@cosmjs/amino'
import { DirectSignResponse } from '@cosmjs/proto-signing'
import { DeliverTxResponse } from '@cosmjs/stargate'
import assert from 'assert'
import { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { ethErrors } from 'eth-rpc-errors'
import PQueue from 'p-queue'

import { CosmAppChainInfo } from '~lib/network/cosm'
import { IChainAccount, INetwork } from '~lib/schema'
import { Provider, TransactionPayload } from '~lib/services/provider'
import { getSigningWallet, isStdSignDoc } from '~lib/wallet'

import { CosmClient, getCosmClient } from './client'

export class CosmProvider implements Provider {
  constructor(public client: CosmClient, private network: INetwork) {}

  static async from(network: INetwork) {
    const client = await getCosmClient(network)
    assert(client)
    return new CosmProvider(client, network)
  }

  async isOk(): Promise<boolean> {
    try {
      await this.client.getBlock()
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  isContract(address: string): Promise<boolean> {
    throw new Error('not implemented')
  }

  async getNextNonce(address: string, tag?: string | number): Promise<number> {
    const { sequence } = await this.client.getSequence(address)
    return sequence
  }

  async getBalance(address: string): Promise<string> {
    const info = this.network.info as CosmAppChainInfo
    const coin = await this.client.getBalance(
      address,
      info.currencies[0].coinMinimalDenom
    )
    return coin.amount
  }

  async getBalances(addresses: string[]): Promise<string[]> {
    const queue = new PQueue({ concurrency: 3 })
    return await queue.addAll(
      addresses.map((addr) => () => this.getBalance(addr))
    )
  }

  async estimateGasPrice(): Promise<any> {
    throw new Error('not implemented')
  }

  async estimateGas(account: IChainAccount, tx: any): Promise<string> {
    throw new Error('not implemented')
  }

  async populateTransaction(
    account: IChainAccount,
    tx: SignDoc | StdSignDoc
  ): Promise<TransactionPayload> {
    return {
      txParams: tx,
      populatedParams: {}
    }
  }

  async signTransaction(
    account: IChainAccount,
    signDoc: SignDoc | StdSignDoc
  ): Promise<DirectSignResponse | AminoSignResponse> {
    if (isStdSignDoc(signDoc) && isADR36AminoSignDoc(signDoc)) {
      checkAndValidateADR36AminoSignDoc(signDoc)
    }

    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signTransaction(signDoc)
  }

  async sendTransaction(
    signedTransaction: Uint8Array
  ): Promise<DeliverTxResponse> {
    return this.client.broadcastTx(signedTransaction)
  }

  async signMessage(account: IChainAccount, message: any): Promise<any> {
    throw new Error('not implemented')
  }

  async getTypedData(typedData: any): Promise<any> {
    throw new Error('not implemented')
  }

  async signTypedData(account: IChainAccount, typedData: any): Promise<any> {
    throw new Error('not implemented')
  }
}

export function makeADR36AminoSignDoc(
  signer: string,
  data: string | Uint8Array
): StdSignDoc {
  data = Buffer.from(data).toString('base64')

  return {
    chain_id: '',
    account_number: '0',
    sequence: '0',
    fee: {
      gas: '0',
      amount: []
    },
    msgs: [
      {
        type: 'sign/MsgSignData',
        value: {
          signer,
          data
        }
      }
    ],
    memo: ''
  }
}

export function isADR36AminoSignDoc(signDoc: StdSignDoc): boolean {
  return signDoc.msgs[0].type === 'sign/MsgSignData'
}

export function checkAndValidateADR36AminoSignDoc(
  signDoc: StdSignDoc
): boolean {
  const hasOnlyMsgSignData = (() => {
    if (
      signDoc &&
      signDoc.msgs &&
      Array.isArray(signDoc.msgs) &&
      signDoc.msgs.length === 1
    ) {
      const msg = signDoc.msgs[0]
      return msg.type === 'sign/MsgSignData'
    } else {
      return false
    }
  })()

  if (!hasOnlyMsgSignData) {
    return false
  }

  if (signDoc.chain_id !== '') {
    throw new Error('Chain id should be empty string for ADR-36 signing')
  }

  if (signDoc.memo !== '') {
    throw new Error('Memo should be empty string for ADR-36 signing')
  }

  if (signDoc.account_number !== '0') {
    throw new Error('Account number should be "0" for ADR-36 signing')
  }

  if (signDoc.sequence !== '0') {
    throw new Error('Sequence should be "0" for ADR-36 signing')
  }

  if (signDoc.fee.gas !== '0') {
    throw new Error('Gas should be "0" for ADR-36 signing')
  }

  if (signDoc.fee.amount.length !== 0) {
    throw new Error('Fee amount should be empty array for ADR-36 signing')
  }

  const msg = signDoc.msgs[0]
  if (msg.type !== 'sign/MsgSignData') {
    throw new Error(`Invalid type of ADR-36 sign msg: ${msg.type}`)
  }
  if (!msg.value) {
    throw new Error('Empty value in the msg')
  }
  const signer = msg.value.signer
  if (!signer) {
    throw new Error('Empty signer in the ADR-36 msg')
  }
  const data = msg.value.data
  if (!data) {
    throw new Error('Empty data in the ADR-36 msg')
  }
  const rawData = Buffer.from(data, 'base64')
  // Validate the data is encoded as base64.
  if (rawData.toString('base64') !== data) {
    throw new Error('Data is not encoded by base64')
  }
  if (rawData.length === 0) {
    throw new Error('Empty data in the ADR-36 msg')
  }

  return true
}
