import { arrayify, hexlify } from '@ethersproject/bytes'
import { AptosAccount, HexString } from 'aptos'
import { TransactionBuilderEd25519, TxnBuilderTypes } from 'aptos'
import assert from 'assert'
import { sign } from 'tweetnacl'

import { HDNode, HardenedBit } from '~lib/crypto/ed25519'
import { KEYSTORE } from '~lib/keystore'
import { DerivePosition } from '~lib/schema'

import { SigningWallet, WalletOpts, WalletType, generatePath } from '.'

export class AptosWallet implements SigningWallet {
  static defaultPath = "m/44'/637'/0'/0'/0'"

  private constructor(private wallet: HDNode | AptosAccount) {}

  static async from({
    id,
    type,
    path
  }: WalletOpts): Promise<AptosWallet | undefined> {
    const ks = await KEYSTORE.get(id, true)
    if (!ks) {
      return undefined
    }
    const mnemonic = ks.mnemonic

    let wallet
    if (type === WalletType.HD) {
      assert(!path && mnemonic)
      wallet = HDNode.fromMnemonic(mnemonic.phrase)
    } else if (type === WalletType.PRIVATE_KEY) {
      if (mnemonic) {
        if (!path) {
          path = AptosWallet.defaultPath
        }
        const node = HDNode.fromMnemonic(mnemonic.phrase).derivePath(path)
        wallet = new AptosAccount(arrayify(node.privateKey))
      } else {
        assert(!path)
        wallet = new AptosAccount(arrayify(ks.privateKey))
      }
    }
    assert(wallet)

    return new AptosWallet(wallet)
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<AptosWallet> {
    assert(index < HardenedBit)
    assert(this.wallet instanceof HDNode)
    const path = generatePath(pathTemplate, index, derivePosition)
    const wallet = this.wallet.derivePath(path)
    return new AptosWallet(wallet)
  }

  private _account?: AptosAccount
  get account() {
    if (!this._account) {
      this._account =
        this.wallet instanceof HDNode
          ? new AptosAccount(arrayify(this.wallet.privateKey))
          : this.wallet
    }
    return this._account
  }

  get address() {
    return this.account.address().toString()
  }

  get publicKey() {
    return this.account.pubKey().toString()
  }

  get privateKey() {
    return hexlify(this.account.signingKey.secretKey.slice(0, 32))
  }

  sign(msg: Uint8Array): Uint8Array {
    return sign.detached(msg, arrayify(this.account.signingKey.secretKey))
  }

  signHex(msg: string): Uint8Array {
    return this.sign(arrayify(msg))
  }

  verify(msg: Uint8Array, sig: Uint8Array): boolean {
    return sign.detached.verify(msg, sig, this.account.signingKey.publicKey)
  }

  verifyHex(msg: string, sig: Uint8Array): boolean {
    return this.verify(arrayify(msg), sig)
  }

  async signTransaction(
    transaction: TxnBuilderTypes.RawTransaction
  ): Promise<Uint8Array> {
    const txnBuilder = new TransactionBuilderEd25519(
      (signingMessage: TxnBuilderTypes.SigningMessage) => {
        const sig = this.sign(signingMessage)
        return new TxnBuilderTypes.Ed25519Signature(sig)
      },
      arrayify(this.publicKey)
    )

    return txnBuilder.sign(transaction)
  }

  async signMessage(message: any): Promise<string> {
    throw new Error('not implemented')
  }

  async signTypedData(typedData: string): Promise<string> {
    return hexlify(this.signHex(typedData))
  }

  static checkAddress(address: string): string | false {
    try {
      address = HexString.fromUint8Array(
        new HexString(address).toUint8Array()
      ).toString()
      assert(address.length === 66)
      return address
    } catch {
      return false
    }
  }
}
