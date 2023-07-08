import { resolveProperties } from '@ethersproject/properties'
import { TransactionRequest } from '@ethersproject/providers'
import type { UserOperationStruct } from '@zerodevapp/contracts'
import { ZeroDevSigner } from '@zerodevapp/sdk'
import assert from 'assert'
import { ethers } from 'ethers'

import { makeZeroDevSigner } from '~lib/erc4337/zerodev'
import { DerivePosition, INetwork } from '~lib/schema'
import { EvmErc4337Client } from '~lib/services/provider/evm'
import { WalletOpts } from '~lib/wallet/base'

import { EvmWallet } from './evm'

export interface EvmErc4337WalletOpts extends WalletOpts {
  extra: {
    network: INetwork
  }
}

export class EvmErc4337Wallet extends EvmWallet {
  protected constructor(
    wallet: ethers.utils.HDNode | ethers.Wallet,
    private network: INetwork
  ) {
    super(wallet)
  }

  static async from({
    type,
    path,
    keystore,
    extra: { network }
  }: EvmErc4337WalletOpts): Promise<EvmErc4337Wallet | undefined> {
    const base = await EvmWallet.buildWallet({ type, path, keystore })
    const wallet = new EvmErc4337Wallet(base, network)
    await wallet.getSigner()
    return wallet
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<EvmErc4337Wallet> {
    const base = await super.derive(pathTemplate, index, derivePosition)
    const wallet = new EvmErc4337Wallet(base.wallet, this.network)
    await wallet.getSigner()
    return wallet
  }

  private _signer: Promise<ZeroDevSigner> | undefined
  private _address: string | undefined

  private async getSigner() {
    if (!this._signer) {
      this._signer = (async () => {
        const provider = await EvmErc4337Client.from(this.network)
        const signer = await makeZeroDevSigner({
          provider: provider.provider,
          signer: this.signingWallet
        })
        this._address = await signer.getAddress()
        return signer
      })()
    }
    return await this._signer
  }

  get address(): string {
    assert(this._address)
    return this._address
  }

  async signTransaction(
    transaction: TransactionRequest
  ): Promise<UserOperationStruct> {
    const signer = await this.getSigner()

    const {
      to,
      data: _data,
      value,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce
    } = transaction

    const target = (to as string) ?? ''
    const data = _data?.toString() ?? '0x'

    const userOp = await signer.smartAccountAPI.createSignedUserOp({
      target,
      data,
      value,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce
    })
    return await resolveProperties(userOp)
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
