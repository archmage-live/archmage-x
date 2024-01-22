import { arrayify } from '@ethersproject/bytes'
import {
  CompilableTransaction,
  IFullySignedTransaction,
  SignatureBytes,
  createPrivateKeyFromBytes,
  signBytes,
  signTransaction,
  verifySignature
} from '@solana/web3.js'
import { Keypair } from '@solana/web3.js-legacy-sham'
import assert from 'assert'
import bs58 from 'bs58'
import { getPublicKey } from 'ed25519-hd-key'

import { HDNode, HardenedBit } from '~lib/crypto/ed25519'
import { DerivePosition } from '~lib/schema'

import { KeystoreSigningWallet, WalletOpts, WalletType, generatePath } from '.'

export class SolWallet implements KeystoreSigningWallet {
  static defaultPath = "m/44'/501'/0'/0'"

  private constructor(private wallet: HDNode | Keypair) {}

  static async from({
    type,
    path,
    keystore
  }: WalletOpts): Promise<SolWallet | undefined> {
    const mnemonic = keystore.mnemonic

    let wallet
    if (type === WalletType.HD || type === WalletType.KEYLESS_HD) {
      assert(!path && mnemonic)
      wallet = HDNode.fromMnemonic(mnemonic.phrase)
    } else if (
      type === WalletType.PRIVATE_KEY ||
      type === WalletType.PRIVATE_KEY_GROUP ||
      type === WalletType.KEYLESS ||
      type === WalletType.KEYLESS_GROUP
    ) {
      if (mnemonic) {
        if (!path) {
          path = SolWallet.defaultPath
        }
        const node = HDNode.fromMnemonic(mnemonic.phrase).derivePath(path)
        wallet = fromPrivateKey(node.privateKey)
      } else {
        assert(!path)
        wallet = fromPrivateKey(keystore.privateKey)
      }
    }
    assert(wallet)

    return new SolWallet(wallet)
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<SolWallet> {
    assert(index < HardenedBit)
    assert(this.wallet instanceof HDNode)
    const path = generatePath(pathTemplate, index, derivePosition)
    const wallet = this.wallet.derivePath(path)
    return new SolWallet(fromPrivateKey(wallet.privateKey))
  }

  get address(): string {
    return this.publicKeyBase58()
  }

  get privateKey(): string {
    return this.secretKeyBase58()
  }

  get publicKey(): string {
    return this.publicKeyBase58()
  }

  publicKeyBase58(): string {
    assert(this.wallet instanceof Keypair)
    return this.wallet.publicKey.toBase58()
  }

  secretKeyBase58(): string {
    assert(this.wallet instanceof Keypair)
    return bs58.encode(arrayify(this.wallet.secretKey))
  }

  async verify(msg: string | Uint8Array, sig: Uint8Array): Promise<boolean> {
    assert(this.wallet instanceof Keypair)
    const keypair = await fromLegacyKeypair(this.wallet)
    return verifySignature(
      keypair.publicKey,
      sig as SignatureBytes,
      arrayify(msg)
    )
  }

  async signTransaction<TTransaction extends CompilableTransaction>(
    transaction: TTransaction
  ): Promise<TTransaction & IFullySignedTransaction> {
    assert(this.wallet instanceof Keypair)
    const keypair = await fromLegacyKeypair(this.wallet)
    return await signTransaction([keypair], transaction)
  }

  async signMessage(message: any): Promise<SignatureBytes> {
    assert(this.wallet instanceof Keypair)
    const keypair = await fromLegacyKeypair(this.wallet)
    return await signBytes(keypair.privateKey, arrayify(message))
  }

  async signTypedData(typedData: any): Promise<string> {
    throw new Error('not implemented')
  }
}

function fromPrivateKey(privateKey: string | Uint8Array): Keypair {
  const privateKeyBytes = arrayify(privateKey)
  const publicKey = getPublicKey(Buffer.from(privateKeyBytes))
  const secretKey = new Uint8Array(64)
  secretKey.set(privateKeyBytes)
  secretKey.set(publicKey, 32)

  return new Keypair({
    publicKey,
    secretKey
  })
}

async function fromLegacyKeypair(
  keypair: Keypair,
  extractable?: boolean
): Promise<CryptoKeyPair> {
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.importKey(
      'raw',
      keypair.publicKey.toBytes(),
      'Ed25519',
      true,
      ['verify']
    ),
    createPrivateKeyFromBytes(keypair.secretKey.slice(0, 32), extractable)
  ])
  return {
    privateKey,
    publicKey
  } as CryptoKeyPair
}
