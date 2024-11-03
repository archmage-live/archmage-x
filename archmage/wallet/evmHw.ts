import { ledgerService } from '@ledgerhq/hw-app-eth'
import { transformTypedData } from '@trezor/connect-plugin-ethereum'
import type {
  EthereumTransaction,
  EthereumTransactionEIP1559
} from '@trezor/connect-web'
import assert from 'assert'
import { Signature, Transaction, getBytes, hexlify } from 'ethers'
import type { TransactionLike } from 'ethers'

import { getLedgerEthApp } from '@/lib/hardware/ledger'
import { getTrezorApp } from '@/lib/hardware/trezor'

import {
  HardwareWalletType,
  SigningWallet,
  WalletPathSchema,
  generatePath
} from './index'

export const HARDWARE_MISMATCH =
  'Connected hardware wallet has a different secret recovery phrase'

export class EvmHwWallet implements SigningWallet {
  path: string

  constructor(
    public hwType: HardwareWalletType,
    public hwHash: string,
    public hwAddress: string,
    public pathSchema: WalletPathSchema,
    pathOrIndex: string | number,
    public publicKey?: string
  ) {
    if (typeof pathOrIndex === 'string') {
      this.path = pathOrIndex
    } else {
      this.path = generatePath(
        pathSchema.pathTemplate,
        pathOrIndex,
        pathSchema.derivePosition
      )
    }
  }

  get address() {
    return this.hwAddress
  }

  protected async getLedgerApp() {
    const [appLedger, hwHash] = await getLedgerEthApp(this.pathSchema)
    assert(
      this.hwHash === this.hwAddress || hwHash === this.hwHash,
      HARDWARE_MISMATCH
    )
    const { address } = await appLedger.getAddress(this.path)
    assert(address === this.hwAddress, HARDWARE_MISMATCH)
    return appLedger
  }

  protected async getTrezorApp() {
    const [appTrezor, hwHash] = await getTrezorApp(this.pathSchema)
    assert(
      this.hwHash === this.hwAddress || hwHash === this.hwHash,
      HARDWARE_MISMATCH
    )

    const rep = await appTrezor.ethereumGetAddress({
      path: this.path,
      showOnTrezor: false
    })

    if (!rep.success) {
      throw new Error(rep.payload.error)
    }

    assert(rep.payload.address === this.hwAddress, HARDWARE_MISMATCH)
    return appTrezor
  }

  async signTransaction(transaction: any): Promise<any> {
    switch (this.hwType) {
      case HardwareWalletType.LEDGER:
        return this._signTransactionLedger(transaction)
      case HardwareWalletType.TREZOR:
        return this._signTransactionTrezor(transaction)
    }
  }

  async signTypedData(typedData: any): Promise<string> {
    switch (this.hwType) {
      case HardwareWalletType.LEDGER:
        return this._signTypedDataLedger(typedData)
      case HardwareWalletType.TREZOR:
        return this._signTypedDataTrezor(typedData)
    }
  }

  async signMessage(message: any): Promise<string> {
    switch (this.hwType) {
      case HardwareWalletType.LEDGER:
        return this._signMessageLedger(message)
      case HardwareWalletType.TREZOR:
        return this._signMessageTrezor(message)
    }
  }

  async _getUnsignedTx(transaction: any): Promise<Transaction> {
    return Transaction.from(transaction as TransactionLike<string>)
  }

  async _signTransactionLedger(transaction: any): Promise<any> {
    const appLedger = await this.getLedgerApp()

    const tx = await this._getUnsignedTx(transaction)

    const unsignedTx = tx.unsignedSerialized.substring(2)
    const resolution = await ledgerService.resolveTransaction(
      unsignedTx,
      {},
      {}
    )
    const sig = await appLedger.signTransaction(
      this.path,
      unsignedTx,
      resolution
    )
    sig.r = '0x' + sig.r
    sig.s = '0x' + sig.s

    tx.signature = Signature.from(sig)

    return tx.serialized
  }

  async _signTypedDataLedger(typedData: any): Promise<string> {
    const appLedger = await this.getLedgerApp()

    const sig = await appLedger.signEIP712Message(this.path, typedData)
    sig.r = '0x' + sig.r
    sig.s = '0x' + sig.s
    return Signature.from(sig).serialized
  }

  async _signMessageLedger(message: any): Promise<string> {
    const appLedger = await this.getLedgerApp()

    const messageHex = hexlify(getBytes(message as string)).substring(2)

    const sig = await appLedger.signPersonalMessage(this.path, messageHex)
    sig.r = '0x' + sig.r
    sig.s = '0x' + sig.s
    return Signature.from(sig).serialized
  }

  async _signTransactionTrezor(transaction: any): Promise<any> {
    const appTrezor = await this.getTrezorApp()

    const tx = await this._getUnsignedTx(transaction)

    const ethTx = {
      to: tx.to || '',
      value: tx.value.toString(),
      gasLimit: tx.gasLimit.toString(),
      nonce: tx.nonce.toString(),
      data: tx.data,
      chainId: Number(tx.chainId)
    }

    const rep = await appTrezor.ethereumSignTransaction({
      path: this.path,
      transaction:
        tx.type === 2
          ? ({
              ...ethTx,
              maxFeePerGas: tx.maxFeePerGas!.toString(),
              maxPriorityFeePerGas: tx.maxPriorityFeePerGas!.toString()
            } as EthereumTransactionEIP1559)
          : ({
              ...ethTx,
              gasPrice: tx.gasPrice!.toString(),
              txType: tx.type
            } as EthereumTransaction)
    })

    if (!rep.success) {
      throw new Error(rep.payload.error)
    }

    const sig = rep.payload

    tx.signature = Signature.from(sig)

    return tx.serialized
  }

  async _signTypedDataTrezor(typedData: any): Promise<string> {
    const appTrezor = await this.getTrezorApp()

    const { domain_separator_hash, message_hash } = transformTypedData(
      typedData,
      true
    )

    const rep = await appTrezor.ethereumSignTypedData({
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

  async _signMessageTrezor(message: any): Promise<string> {
    const appTrezor = await this.getTrezorApp()

    const rep = await appTrezor.ethereumSignMessage({
      path: this.path,
      message: hexlify(getBytes(message as string)),
      hex: true
    })

    if (!rep.success) {
      throw new Error(rep.payload.error)
    }

    return rep.payload.signature
  }
}
