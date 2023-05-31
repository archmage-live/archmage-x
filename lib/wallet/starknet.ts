// https://community.starknet.io/t/account-keys-and-addresses-derivation-standard/1230
// https://github.com/argentlabs/argent-x/blob/develop/packages/extension/src/background/keys/keyDerivation.ts
import assert from 'assert'
import { ethers } from 'ethers'
import {
  Call,
  InvocationsSignerDetails,
  KeyPair,
  Signature,
  Signer,
  ec,
  stark
} from 'starknet'
import {
  calculateContractAddressFromHash,
  getSelectorFromName
} from 'starknet/utils/hash'

import { getStarkPair } from '~lib/crypto/starkpair'
import { KEYSTORE } from '~lib/keystore'
import { DerivePosition } from '~lib/schema'

import { KeystoreSigningWallet, WalletOpts, WalletType, generatePath } from '.'

const ARGENT_PROXY_CONTRACT_CLASS_HASHES = [
  '0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918'
]
const ARGENT_ACCOUNT_CONTRACT_CLASS_HASHES = [
  '0x3e327de1c40540b98d05cbcb13552008e36f0ec8d61d46956d2f9752c294328',
  '0x7e28fb0161d10d1cf7fe1f13e7ca57bce062731a3bd04494dfd2d0412699727'
]

export class StarknetWallet implements KeystoreSigningWallet {
  static defaultPath = "m/44'/9004'/0'/0/0"

  private constructor(
    private wallet: ethers.utils.HDNode | ethers.Wallet,
    private keyPair: KeyPair
  ) {}

  static async from({
    id,
    type,
    index,
    path
  }: WalletOpts): Promise<StarknetWallet | undefined> {
    const ks = await KEYSTORE.get(id, index, true)
    if (!ks) {
      return undefined
    }
    const mnemonic = ks.mnemonic

    let wallet
    if (type === WalletType.HD) {
      assert(!path && mnemonic)
      wallet = ethers.utils.HDNode.fromMnemonic(mnemonic.phrase)
    } else if (type === WalletType.PRIVATE_KEY) {
      if (mnemonic) {
        if (!path) {
          path = StarknetWallet.defaultPath
        }
        wallet = ethers.Wallet.fromMnemonic(mnemonic.phrase, path)
      } else {
        assert(!path)
        wallet = new ethers.Wallet(ks.privateKey)
      }
    }
    assert(wallet)

    return new StarknetWallet(wallet, getStarkPair(wallet))
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<StarknetWallet> {
    assert(this.wallet instanceof ethers.utils.HDNode)
    const path = generatePath(pathTemplate, index, derivePosition)
    const wallet = this.wallet.derivePath(path)
    return new StarknetWallet(wallet, getStarkPair(wallet))
  }

  get address(): string {
    const contractClassHash = ARGENT_PROXY_CONTRACT_CLASS_HASHES[0]
    const accountClassHash = ARGENT_ACCOUNT_CONTRACT_CLASS_HASHES[0]

    return calculateContractAddressFromHash(
      this.publicKey,
      contractClassHash,
      stark.compileCalldata({
        implementation: accountClassHash,
        selector: getSelectorFromName('initialize'),
        calldata: stark.compileCalldata({
          signer: this.publicKey,
          guardian: '0'
        })
      }),
      0
    )
  }

  get privateKey(): string {
    return this.keyPair.getPrivate().toString()
  }

  get publicKey(): string {
    return ec.getStarkKey(this.keyPair)
  }

  async signTransaction(
    transactions: Call[],
    transactionsDetail: InvocationsSignerDetails
  ): Promise<any> {
    const signer = new Signer(this.keyPair)
    return signer.signTransaction(transactions, transactionsDetail)
  }

  async signMessage(message: any): Promise<string> {
    throw new Error('not implemented')
  }

  async signTypedData(typedData: any): Promise<Signature> {
    const signer = new Signer(this.keyPair)
    return signer.signMessage(typedData, this.address)
  }
}
