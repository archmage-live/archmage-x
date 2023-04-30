import { arrayify } from '@ethersproject/bytes'
import assert from 'assert'
import bitcoin from 'bitcoinjs-lib'
import ECPairFactory from 'ecpair'
import { ethers } from 'ethers'
import * as ecc from 'tiny-secp256k1'
// @ts-ignore
import * as wif from 'wif'

import { KEYSTORE } from '~lib/keystore'
import { DerivePosition } from '~lib/schema'

import { KeystoreSigningWallet, WalletOpts, WalletType, generatePath } from '.'

export enum BtcAddressType {
  LEGACY = 'Legacy', // legacy; P2PKH
  NESTED_SEGWIT = 'NestedSegWit', // SegWit; P2SH; P2WPKH-nested-in-P2SH
  NATIVE_SEGWIT = 'NativeSegWit', // Native SegWit; bech32; P2WPKH
  TAPROOT = 'Taproot' // Taproot; bech32m; P2TR
}

export interface BtcWalletOpts extends WalletOpts {
  extra: {
    addressType: BtcAddressType
    isTestnet: boolean
    network: bitcoin.Network
  }
}

export class BtcWallet implements KeystoreSigningWallet {
  static defaultPath = BtcWallet.getDefaultPath(
    BtcAddressType.NATIVE_SEGWIT,
    false
  )

  static getDefaultPath(addressType: BtcAddressType, isTestnet: boolean) {
    let purpose
    switch (addressType) {
      case BtcAddressType.LEGACY:
        purpose = 44 // https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
        break
      case BtcAddressType.NESTED_SEGWIT:
        purpose = 49 // https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki
        break
      case BtcAddressType.NATIVE_SEGWIT:
        purpose = 84 // https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
        break
      case BtcAddressType.TAPROOT:
        purpose = 86 // https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki
        break
    }
    const coinType = !isTestnet ? 0 : 1
    return `m/${purpose}'/${coinType}'/0'/0/0`
  }

  address: string
  privateKey: string
  publicKey: string

  private constructor(
    private wallet: ethers.utils.HDNode | ethers.Wallet,
    private addressType: BtcAddressType,
    private network: bitcoin.Network
  ) {
    this.privateKey = wif.encode(
      network.wif,
      Buffer.from(arrayify(wallet.privateKey)),
      true
    ) // Private key (WIF, compressed pubkey)

    this.publicKey = wallet.publicKey // TODO: use any other encoding?

    const publicKey = Buffer.from(arrayify(wallet.publicKey))

    let payment
    switch (addressType) {
      case BtcAddressType.LEGACY:
        payment = bitcoin.payments.p2pkh({ pubkey: publicKey, network })
        break
      case BtcAddressType.NESTED_SEGWIT:
        payment = bitcoin.payments.p2sh({
          redeem: bitcoin.payments.p2wpkh({ pubkey: publicKey, network })
        })
        break
      case BtcAddressType.NATIVE_SEGWIT:
        payment = bitcoin.payments.p2wpkh({ pubkey: publicKey, network })
        break
      case BtcAddressType.TAPROOT:
        payment = bitcoin.payments.p2tr({ internalPubkey: publicKey, network }) // TODO
        break
    }

    this.address = payment.address!
  }

  static async from({
    id,
    type,
    path,
    extra: { addressType, isTestnet, network }
  }: BtcWalletOpts): Promise<BtcWallet | undefined> {
    const ks = await KEYSTORE.get(id, true)
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
          path = BtcWallet.getDefaultPath(addressType, isTestnet)
        }
        wallet = ethers.Wallet.fromMnemonic(mnemonic.phrase, path)
      } else {
        assert(!path)
        wallet = new ethers.Wallet(ks.privateKey)
      }
    }
    assert(wallet)

    return new BtcWallet(wallet, addressType, network)
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<BtcWallet> {
    assert(this.wallet instanceof ethers.utils.HDNode)
    const path = generatePath(pathTemplate, index, derivePosition)
    const wallet = this.wallet.derivePath(path)
    return new BtcWallet(wallet, this.addressType, this.network)
  }

  async signTransaction(
    transaction: bitcoin.Psbt,
    ...args: any[]
  ): Promise<string> {
    const ECPair = ECPairFactory(ecc)
    const key = ECPair.fromWIF(this.privateKey, this.network)
    await transaction.signAllInputsAsync(key)
    transaction.finalizeAllInputs()
    return transaction.extractTransaction().toHex()
  }

  async signMessage(message: any): Promise<any> {
    throw new Error('not implemented')
  }

  async signTypedData(typedData: any): Promise<any> {
    throw new Error('not implemented')
  }
}
