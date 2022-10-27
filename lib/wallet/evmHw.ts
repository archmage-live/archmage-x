import { arrayify } from '@ethersproject/bytes'
import { TransactionRequest } from '@ethersproject/providers'
import { ledgerService } from '@ledgerhq/hw-app-eth'
import assert from 'assert'
import { ethers } from 'ethers'

import { getLedgerEthApp } from '~lib/hardware/ledger'
import { DerivePosition } from '~lib/schema'

import { SigningWallet, generatePath } from '.'

const HARDWARE_MISMATCH =
  'Connected hardware wallet has a different secret recovery phrase'

export class EvmHwWallet implements SigningWallet {
  path: string

  constructor(
    public hwHash: string,
    public address: string,
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition,
    public publicKey?: string
  ) {
    this.path = generatePath(pathTemplate, index, derivePosition)
  }

  private async getLedgerApp() {
    const [appEth, hwHash] = await getLedgerEthApp()
    assert(hwHash === this.hwHash, HARDWARE_MISMATCH)
    return appEth
  }

  async signTransaction(transaction: any): Promise<any> {
    const appEth = await this.getLedgerApp()

    const tx = (await ethers.utils.resolveProperties(
      transaction
    )) as TransactionRequest
    const baseTx: ethers.utils.UnsignedTransaction = {
      chainId: tx.chainId || undefined,
      data: tx.data || undefined,
      gasLimit: tx.gasLimit || undefined,
      gasPrice: tx.gasPrice || undefined,
      nonce: tx.nonce ? ethers.BigNumber.from(tx.nonce).toNumber() : undefined,
      to: tx.to || undefined,
      value: tx.value || undefined,
      type: tx.type || undefined,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas || undefined,
      maxFeePerGas: tx.maxFeePerGas || undefined
    }

    const unsignedTx = ethers.utils.serializeTransaction(baseTx).substring(2)
    const resolution = await ledgerService.resolveTransaction(
      unsignedTx,
      {},
      {}
    )
    const sig = await appEth.signTransaction(this.path!, unsignedTx, resolution)

    return ethers.utils.serializeTransaction(baseTx, {
      v: ethers.BigNumber.from('0x' + sig.v).toNumber(),
      r: '0x' + sig.r,
      s: '0x' + sig.s
    })
  }

  async signTypedData(typedData: any): Promise<string> {
    const appEth = await this.getLedgerApp()

    const sig = await appEth.signEIP712Message(this.path!, typedData)
    sig.r = '0x' + sig.r
    sig.s = '0x' + sig.s
    return ethers.utils.joinSignature(sig)
  }

  async signMessage(message: any): Promise<string> {
    const appEth = await this.getLedgerApp()

    const messageHex = ethers.utils
      .hexlify(arrayify(message as string))
      .substring(2)

    const sig = await appEth.signPersonalMessage(this.path!, messageHex)
    sig.r = '0x' + sig.r
    sig.s = '0x' + sig.s
    return ethers.utils.joinSignature(sig)
  }
}
