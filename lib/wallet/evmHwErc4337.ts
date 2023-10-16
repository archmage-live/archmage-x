import {
  Signer,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer'
import { Bytes, arrayify, hexlify, joinSignature } from '@ethersproject/bytes'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { Deferrable } from '@ethersproject/properties'
import { Provider, TransactionRequest } from '@ethersproject/providers'
import LedgerAppEth from '@ledgerhq/hw-app-eth'
import { transformTypedData } from '@trezor/connect-plugin-ethereum'
import { UserOperationStruct } from '@zerodevapp/contracts'
import assert from 'assert'

import { makeZeroDevSigner } from '~lib/erc4337/zerodev'
import type { TrezorConnectApp } from '~lib/hardware/trezor'
import { INetwork } from '~lib/schema'
import { EvmErc4337Client } from '~lib/services/provider/evm'

import { Erc4337Wallet, HardwareWalletType, WalletPathSchema } from './base'
import { signErc4337Transaction } from './evmErc4337'
import { EvmHwWallet } from './evmHw'

export class EvmHwErc4337Wallet extends EvmHwWallet implements Erc4337Wallet {
  constructor(
    private network: INetwork,
    hwType: HardwareWalletType,
    hwHash: string,
    hwAddress: string,
    pathSchema: WalletPathSchema,
    pathOrIndex: string | number,
    publicKey?: string
  ) {
    super(hwType, hwHash, hwAddress, pathSchema, pathOrIndex, publicKey)
  }

  _provider: EvmErc4337Client | undefined
  _address: string | undefined

  async prepare() {
    if (!this._provider) {
      const provider = await EvmErc4337Client.fromMayUndefined(this.network)
      if (!provider) {
        return undefined
      }
      this._provider = provider
    }

    return this
  }

  get provider() {
    assert(this._provider)
    return this._provider
  }

  private async getSigner() {
    let app
    switch (this.hwType) {
      case HardwareWalletType.LEDGER:
        app = await this.getLedgerApp()
        break
      case HardwareWalletType.TREZOR:
        app = await this.getTrezorApp()
        break
    }

    return await makeZeroDevSigner({
      provider: this.provider.provider,
      signer: new HwSigner(this.hwType, app, this.hwAddress, this.path)
    })
  }

  async getAddress() {
    const signer = await this.getSigner()
    this._address = await signer.getAddress()
    return this
  }

  get address() {
    assert(this._address)
    return this._address
  }

  get owner() {
    return this.hwAddress
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
    private hwType: HardwareWalletType,
    private hwApp: LedgerAppEth | TrezorConnectApp,
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
    switch (this.hwType) {
      case HardwareWalletType.LEDGER:
        return this._signMessageLedger(message)
      case HardwareWalletType.TREZOR:
        return this._signMessageTrezor(message)
    }
  }

  async _signMessageLedger(message: Bytes | string): Promise<string> {
    const messageHex = hexlify(arrayify(message as string)).substring(2)

    const sig = await (this.hwApp as LedgerAppEth).signPersonalMessage(
      this.path,
      messageHex
    )
    sig.r = '0x' + sig.r
    sig.s = '0x' + sig.s
    return joinSignature(sig)
  }

  async _signMessageTrezor(message: Bytes | string): Promise<string> {
    const rep = await (this.hwApp as TrezorConnectApp).ethereumSignMessage({
      path: this.path,
      message: hexlify(arrayify(message as string)),
      hex: true
    })

    if (!rep.success) {
      throw new Error(rep.payload.error)
    }

    return rep.payload.signature
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
    switch (this.hwType) {
      case HardwareWalletType.LEDGER:
        return this._signTypedDataLedger(domain, types, value)
      case HardwareWalletType.TREZOR:
        return this._signTypedDataTrezor(domain, types, value)
    }
  }

  async _signTypedDataLedger(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    const typedData = _TypedDataEncoder.getPayload(domain, types, value)
    const sig = await (this.hwApp as LedgerAppEth).signEIP712Message(
      this.path,
      typedData
    )
    sig.r = '0x' + sig.r
    sig.s = '0x' + sig.s
    return joinSignature(sig)
  }

  async _signTypedDataTrezor(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    const typedData = _TypedDataEncoder.getPayload(domain, types, value)
    const { domain_separator_hash, message_hash } = transformTypedData(
      typedData,
      true
    )

    const rep = await (this.hwApp as TrezorConnectApp).ethereumSignTypedData({
      path: this.path,
      data: typedData,
      metamask_v4_compat: true,
      domain_separator_hash,
      message_hash: message_hash || undefined
    })

    if (!rep.success) {
      throw new Error(rep.payload.error)
    }

    return rep.payload.signature
  }
}
