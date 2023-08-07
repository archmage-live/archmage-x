import { BigNumber } from '@ethersproject/bignumber'
import { resolveProperties } from '@ethersproject/properties'
import { TransactionRequest } from '@ethersproject/providers'
import type { UserOperationStruct } from '@zerodevapp/contracts'
import { ZeroDevSigner } from '@zerodevapp/sdk'
import assert from 'assert'
import { ethers } from 'ethers'

import { makeZeroDevSigner } from '~lib/erc4337/zerodev'
import { DerivePosition, INetwork } from '~lib/schema'
import { EvmErc4337Client } from '~lib/services/provider/evm'
import { stringifyBigNumberish } from '~lib/utils'

import { Erc4337Wallet, WalletOpts } from './base'
import { EvmWallet } from './evm'

export interface EvmErc4337WalletOpts extends WalletOpts {
  extra: {
    network: INetwork
  }
}

export class EvmErc4337Wallet extends EvmWallet implements Erc4337Wallet {
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
    if (!(await wallet.getSigner())) {
      return
    }
    return wallet
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<EvmErc4337Wallet> {
    const base = await super.derive(pathTemplate, index, derivePosition)
    const wallet = new EvmErc4337Wallet(base.wallet, this.network)
    assert(await wallet.getSigner())
    return wallet
  }

  private _signer: ZeroDevSigner | undefined
  private _address: string | undefined
  private _owner: string | undefined

  private async getSigner() {
    const provider = await EvmErc4337Client.fromMayUndefined(this.network)
    if (!provider) {
      return
    }
    const signer = await makeZeroDevSigner({
      provider: provider.provider,
      signer: this.signingWallet
    })
    this._signer = signer
    this._address = await signer.getAddress()
    this._owner = this.signingWallet.address
    return signer
  }

  get signer(): ZeroDevSigner {
    assert(this._signer)
    return this._signer
  }

  get address(): string {
    assert(this._address)
    return this._address
  }

  get owner(): string {
    assert(this._owner)
    return this._owner
  }

  async signTransaction(
    transaction: TransactionRequest
  ): Promise<UserOperationStruct> {
    return await signErc4337Transaction(this.signer, transaction)
  }

  async signMessage(message: any): Promise<string> {
    return await this.signer.signMessage(message)
  }

  async signTypedData({ domain, types, message }: any): Promise<string> {
    return await this.signer.signTypedData({ domain, types, message })
  }
}

export async function signErc4337Transaction(
  signer: ZeroDevSigner,
  transaction: TransactionRequest
): Promise<UserOperationStruct> {
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
  const resolved = await resolveProperties(userOp)
  return {
    ...resolved,
    nonce: BigNumber.from(resolved.nonce).toString(),
    callGasLimit: BigNumber.from(resolved.callGasLimit).toString(),
    verificationGasLimit: BigNumber.from(
      resolved.verificationGasLimit
    ).toString(),
    preVerificationGas: BigNumber.from(resolved.preVerificationGas).toString(),
    maxFeePerGas: BigNumber.from(resolved.maxFeePerGas).toString(),
    maxPriorityFeePerGas: BigNumber.from(
      resolved.maxPriorityFeePerGas
    ).toString()
  }
}
