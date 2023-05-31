import { arrayify, hexlify } from '@ethersproject/bytes'
import {
  Base64DataBuffer,
  Ed25519Keypair,
  SignableTransaction,
  SignaturePubkeyPair,
  TxnDataSerializer,
  normalizeSuiAddress
} from '@mysten/sui.js'
import { isValidSuiAddress } from '@mysten/sui.js/src/types/common'
import assert from 'assert'

import { HDNode, HardenedBit } from '~lib/crypto/ed25519'
import { KEYSTORE } from '~lib/keystore'
import { DerivePosition } from '~lib/schema'

import { KeystoreSigningWallet, WalletOpts, WalletType, generatePath } from '.'

export class SuiWallet implements KeystoreSigningWallet {
  static defaultPath = "m/44'/784'/0'/0'/0'"

  private constructor(private wallet: HDNode | Ed25519Keypair) {}

  static async from({
    id,
    type,
    index,
    path
  }: WalletOpts): Promise<SuiWallet | undefined> {
    const ks = await KEYSTORE.get(id, index, true)
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
          path = SuiWallet.defaultPath
        }
        const node = HDNode.fromMnemonic(mnemonic.phrase).derivePath(path)
        wallet = Ed25519Keypair.fromSecretKey(arrayify(node.secretKey!))
      } else {
        assert(!path)
        wallet = Ed25519Keypair.fromSeed(arrayify(ks.privateKey))
      }
    }
    assert(wallet)

    return new SuiWallet(wallet)
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<SuiWallet> {
    assert(index < HardenedBit)
    assert(this.wallet instanceof HDNode)
    const path = generatePath(pathTemplate, index, derivePosition)
    const node = this.wallet.derivePath(path)
    const wallet = Ed25519Keypair.fromSecretKey(arrayify(node.secretKey!))
    return new SuiWallet(wallet)
  }

  get address() {
    assert(this.wallet instanceof Ed25519Keypair)
    return this.wallet.getPublicKey().toSuiAddress()
  }

  get privateKey() {
    assert(this.wallet instanceof Ed25519Keypair)
    return hexlify((this.wallet as any).keypair.secretKey.slice(0, 32))
  }

  get publicKey() {
    assert(this.wallet instanceof Ed25519Keypair)
    return this.wallet.getPublicKey().toString()
  }

  async signTransaction(
    transaction: Base64DataBuffer | SignableTransaction,
    serializer?: TxnDataSerializer
  ): Promise<{ txnBytes: string; signature: SignaturePubkeyPair }> {
    assert(this.wallet instanceof Ed25519Keypair)

    if (
      transaction instanceof Base64DataBuffer ||
      transaction.kind === 'bytes'
    ) {
      const txBytes =
        transaction instanceof Base64DataBuffer
          ? transaction
          : new Base64DataBuffer(transaction.data)

      const signature = {
        signatureScheme: this.wallet.getKeyScheme(),
        signature: this.wallet.signData(txBytes),
        pubKey: this.wallet.getPublicKey()
      } as SignaturePubkeyPair

      return {
        txnBytes: txBytes.toString(),
        signature
      }
    }

    assert(serializer)

    const signerAddress = this.address
    let txBytes

    switch (transaction.kind) {
      case 'moveCall':
        txBytes = await serializer.newMoveCall(signerAddress, transaction.data)
        break
      case 'transferSui':
        txBytes = await serializer.newTransferSui(
          signerAddress,
          transaction.data
        )
        break
      case 'transferObject':
        txBytes = await serializer.newTransferObject(
          signerAddress,
          transaction.data
        )
        break
      case 'mergeCoin':
        txBytes = await serializer.newMergeCoin(signerAddress, transaction.data)
        break
      case 'splitCoin':
        txBytes = await serializer.newSplitCoin(signerAddress, transaction.data)
        break
      case 'pay':
        txBytes = await serializer.newPay(signerAddress, transaction.data)
        break
      case 'paySui':
        txBytes = await serializer.newPaySui(signerAddress, transaction.data)
        break
      case 'payAllSui':
        txBytes = await serializer.newPayAllSui(signerAddress, transaction.data)
        break
      case 'publish':
        txBytes = await serializer.newPublish(signerAddress, transaction.data)
        break
      default:
        throw new Error(
          `Unknown transaction kind: "${(transaction as any).kind}"`
        )
    }

    return this.signTransaction(txBytes)
  }

  async signMessage(message: any): Promise<string> {
    throw new Error('not implemented')
  }

  async signTypedData(typedData: any): Promise<string> {
    throw new Error('not implemented')
  }

  static checkAddress(address: string): string | false {
    try {
      const addr = normalizeSuiAddress(address)
      if (!isValidSuiAddress(addr)) {
        return false
      }
      return addr
    } catch {
      return false
    }
  }
}
