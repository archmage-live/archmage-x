import {
  Signer,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer'
import { Bytes, arrayify } from '@ethersproject/bytes'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { Deferrable } from '@ethersproject/properties'
import { Provider, TransactionRequest } from '@ethersproject/providers'
import LedgerAppEth from '@ledgerhq/hw-app-eth'
import { UserOperationStruct } from '@zerodevapp/contracts'
import { ethers } from 'ethers'

import { makeZeroDevSigner } from '~lib/erc4337/zerodev'
import { INetwork } from '~lib/schema'
import { EvmErc4337Client } from '~lib/services/provider/evm'
import { WalletPathSchema } from '~lib/wallet/base'

import { signErc4337Transaction } from './evmErc4337'
import { EvmHwWallet } from './evmHw'

export class EvmHwErc4337Wallet extends EvmHwWallet {
  constructor(
    private network: INetwork,
    hwHash: string,
    address: string,
    pathSchema: WalletPathSchema,
    pathOrIndex: string | number,
    publicKey?: string
  ) {
    super(hwHash, address, pathSchema, pathOrIndex, publicKey)
  }

  private async getSigner() {
    const appEth = await this.getLedgerApp()
    const provider = await EvmErc4337Client.from(this.network)
    return await makeZeroDevSigner({
      provider: provider.provider,
      signer: new HwSigner(appEth, this.address, this.path)
    })
  }

  async signTransaction(
    transaction: TransactionRequest
  ): Promise<UserOperationStruct> {
    const signer = await this.getSigner()
    return await signErc4337Transaction(signer, transaction)
  }

  async signMessage(message: any): Promise<string> {
    const signer = await this.getSigner()
    return await signer.signMessage(message)
  }

  async signTypedData({ domain, types, message }: any): Promise<string> {
    const signer = await this.getSigner()
    return await signer.signTypedData({ domain, types, message })
  }
}

class HwSigner extends Signer implements TypedDataSigner {
  constructor(
    private appEth: LedgerAppEth,
    private address: string,
    private path: string
  ) {
    super()
  }

  connect(provider: Provider): Signer {
    // not used
    throw new Error('not implemented')
  }

  async getAddress(): Promise<string> {
    return this.address
  }

  async signMessage(message: Bytes | string): Promise<string> {
    const messageHex = ethers.utils
      .hexlify(arrayify(message as string))
      .substring(2)

    const sig = await this.appEth.signPersonalMessage(this.path, messageHex)
    sig.r = '0x' + sig.r
    sig.s = '0x' + sig.s
    return ethers.utils.joinSignature(sig)
  }

  signTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    // not used
    throw new Error('not implemented')
  }

  async _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    const typedData = _TypedDataEncoder.getPayload(domain, types, value)
    const sig = await this.appEth.signEIP712Message(this.path, typedData)
    sig.r = '0x' + sig.r
    sig.s = '0x' + sig.s
    return ethers.utils.joinSignature(sig)
  }
}
