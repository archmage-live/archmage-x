import { arrayify } from '@ethersproject/bytes'
import { TransactionRequest } from '@ethersproject/providers'
import { ledgerService } from '@ledgerhq/hw-app-eth'
import { ethers } from 'ethers'

import { getLedgerEthApp } from '~lib/hardware/ledger'
import { DerivePosition } from '~lib/schema'

import { SigningWallet, generatePath } from '.'

export class EvmHwWallet implements SigningWallet {
  path: string

  constructor(
    public address: string,
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition,
    public publicKey?: string
  ) {
    this.path = generatePath(pathTemplate, index, derivePosition)
  }

  async signTransaction(transaction: any): Promise<any> {
    const appEth = await getLedgerEthApp()

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
      value: tx.value || undefined
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
    const appEth = await getLedgerEthApp()
    const sig = await appEth.signEIP712Message(this.path!, typedData)
    sig.r = '0x' + sig.r
    sig.s = '0x' + sig.s
    return ethers.utils.joinSignature(sig)
  }

  async signMessage(message: any): Promise<string> {
    const appEth = await getLedgerEthApp()

    const messageHex = ethers.utils
      .hexlify(arrayify(message as string))
      .substring(2)

    const sig = await appEth.signPersonalMessage(this.path!, messageHex)
    sig.r = '0x' + sig.r
    sig.s = '0x' + sig.s
    return ethers.utils.joinSignature(sig)
  }
}
