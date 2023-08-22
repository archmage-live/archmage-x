// https://community.starknet.io/t/account-keys-and-addresses-derivation-standard/1230
// https://github.com/argentlabs/argent-x/blob/develop/packages/extension/src/background/keys/keyDerivation.ts
import assert from 'assert'
import { ethers } from 'ethers'
import {
  Call,
  CallData,
  DeclareSignerDetails,
  DeployAccountSignerDetails,
  InvocationsSignerDetails,
  Signature,
  Signer,
  TypedData,
  ec,
  hash
} from 'starknet'

import { argentGrindKey } from '~lib/crypto/argentGrindKey'
import { DerivePosition } from '~lib/schema'

import { KeystoreSigningWallet, WalletOpts, WalletType, generatePath } from '.'

const ARGENT_PROXY_CONTRACT_CLASS_HASHES = [
  '0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918'
]
const ARGENT_ACCOUNT_CONTRACT_CLASS_HASHES = [
  '0x33434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2',
  '0x1a7820094feaf82d53f53f214b81292d717e7bb9a92bb2488092cd306f3993f',
  '0x3e327de1c40540b98d05cbcb13552008e36f0ec8d61d46956d2f9752c294328',
  '0x7e28fb0161d10d1cf7fe1f13e7ca57bce062731a3bd04494dfd2d0412699727'
]

export class StarknetWallet implements KeystoreSigningWallet {
  static defaultPath = "m/44'/9004'/0'/0/0"

  private constructor(
    private wallet: ethers.utils.HDNode | ethers.Wallet,
    public privateKey: string
  ) {}

  static async from({
    type,
    path,
    keystore
  }: WalletOpts): Promise<StarknetWallet | undefined> {
    const mnemonic = keystore.mnemonic

    let wallet
    if (type === WalletType.HD || type === WalletType.KEYLESS_HD) {
      assert(!path && mnemonic)
      wallet = ethers.utils.HDNode.fromMnemonic(mnemonic.phrase)
    } else if (
      type === WalletType.PRIVATE_KEY ||
      type === WalletType.PRIVATE_KEY_GROUP ||
      type === WalletType.KEYLESS ||
      type === WalletType.KEYLESS_GROUP
    ) {
      if (mnemonic) {
        if (!path) {
          path = StarknetWallet.defaultPath
        }
        wallet = ethers.Wallet.fromMnemonic(mnemonic.phrase, path)
      } else {
        assert(!path)
        wallet = new ethers.Wallet(keystore.privateKey)
      }
    }
    assert(wallet)

    return new StarknetWallet(wallet, argentGrindKey(wallet.privateKey))
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<StarknetWallet> {
    assert(this.wallet instanceof ethers.utils.HDNode)
    const path = generatePath(pathTemplate, index, derivePosition)
    const wallet = this.wallet.derivePath(path)
    return new StarknetWallet(wallet, argentGrindKey(wallet.privateKey))
  }

  get address(): string {
    const contractClassHash = ARGENT_PROXY_CONTRACT_CLASS_HASHES[0]
    const accountClassHash = ARGENT_ACCOUNT_CONTRACT_CLASS_HASHES[0]

    return hash.calculateContractAddressFromHash(
      this.publicKey,
      contractClassHash,
      CallData.compile({
        implementation: accountClassHash,
        selector: hash.getSelectorFromName('initialize'),
        calldata: CallData.compile({
          signer: this.publicKey,
          guardian: '0'
        })
      }),
      0
    )
  }

  get publicKey(): string {
    return ec.starkCurve.getStarkKey(this.privateKey)
  }

  async signTransaction(
    transaction: Call[] | DeployAccountSignerDetails | DeclareSignerDetails,
    transactionsDetail?: InvocationsSignerDetails
  ): Promise<any> {
    const signer = new Signer(this.privateKey)
    if (Array.isArray(transaction)) {
      assert(transactionsDetail)
      return signer.signTransaction(transaction, transactionsDetail)
    } else if (isDeployAccountSignerDetails(transaction)) {
      assert(!transactionsDetail)
      return signer.signDeployAccountTransaction(transaction)
    } else {
      assert(!transactionsDetail)
      return signer.signDeclareTransaction(transaction)
    }
  }

  async signMessage(message: any): Promise<string> {
    throw new Error('not implemented')
  }

  async signTypedData(typedData: TypedData): Promise<Signature> {
    const signer = new Signer(this.privateKey)
    return signer.signMessage(typedData, this.address)
  }
}

function isDeployAccountSignerDetails(
  tx: DeployAccountSignerDetails | DeclareSignerDetails
): tx is DeployAccountSignerDetails {
  const type = typeof (tx as DeployAccountSignerDetails).contractAddress
  return type === 'string' || type === 'number' || type === 'bigint'
}
