import type { BigNumber } from '@ethersproject/bignumber'
import {
  BytesLike,
  arrayify,
  hexDataSlice,
  hexZeroPad,
  hexlify
} from '@ethersproject/bytes'
import { HDNode as BaseHDNode } from '@ethersproject/hdnode'
import type { Mnemonic } from '@ethersproject/hdnode'
import {
  entropyToMnemonic,
  mnemonicToEntropy,
  mnemonicToSeed
} from '@ethersproject/hdnode/src.ts'
import { defineReadOnly } from '@ethersproject/properties'
import {
  SupportedAlgorithm,
  computeHmac,
  ripemd160,
  sha256
} from '@ethersproject/sha2'
import { Wordlist, wordlists } from '@ethersproject/wordlists'
import { getMasterKeyFromSeed, getPublicKey } from 'ed25519-hd-key'
import sha3 from 'js-sha3'
import { sign } from 'tweetnacl'

function bytes32(value: BigNumber | Uint8Array): string {
  return hexZeroPad(hexlify(value), 32)
}

function getWordlist(wordlist?: string | Wordlist): Wordlist {
  if (!wordlist) {
    return wordlists['en']
  }

  if (typeof wordlist === 'string') {
    const words = wordlists[wordlist]
    if (words == null) {
      throw new Error(`unknown locale: ${wordlist}`)
    }
    return words
  }

  return wordlist
}

export function computeAddress(key: BytesLike | string): string {
  const hash = sha3.sha3_256.create()
  hash.update(Buffer.from(arrayify(key)))
  hash.update('\x00')
  return '0x' + hash.hex()
}

export const HardenedBit = 0x80000000

const _constructorGuard: any = {}

export class HDNode extends BaseHDNode {
  readonly secretKey!: string | null

  /**
   *  This constructor should not be called directly.
   *
   *  Please use:
   *   - fromMnemonic
   *   - fromSeed
   */
  // @ts-ignore
  constructor(
    constructorGuard: any,
    privateKey: string,
    publicKey: string,
    parentFingerprint: string,
    chainCode: string,
    index: number,
    depth: number,
    mnemonicOrPath: Mnemonic | string | null
  ) {
    /* istanbul ignore if */
    if (constructorGuard !== _constructorGuard) {
      throw new Error('HDNode constructor cannot be called directly')
    }

    const that = Object.create(new.target.prototype)

    if (privateKey) {
      const privateKeyBuf = Buffer.from(arrayify(privateKey))
      const keyPair = sign.keyPair.fromSeed(privateKeyBuf)
      defineReadOnly(that, 'privateKey', hexlify(privateKey))
      defineReadOnly(that, 'secretKey', hexlify(keyPair.secretKey))
      // NOTE: withZeroByte = false
      defineReadOnly(
        that,
        'publicKey',
        hexlify(getPublicKey(privateKeyBuf, false))
      )
    } else {
      defineReadOnly(that, 'privateKey', null)
      defineReadOnly(that, 'secretKey', null)
      let publicKeyBuf = arrayify(publicKey)
      if (publicKeyBuf.length === 33 && publicKeyBuf[0] === 0) {
        publicKeyBuf = publicKeyBuf.slice(1)
      }
      defineReadOnly(that, 'publicKey', hexlify(publicKeyBuf))
    }

    defineReadOnly(that, 'parentFingerprint', parentFingerprint)
    const publicKeyWithZero = Uint8Array.of(0, ...arrayify(that.publicKey))
    defineReadOnly(
      that,
      'fingerprint',
      hexDataSlice(ripemd160(sha256(publicKeyWithZero)), 0, 4)
    )

    defineReadOnly(that, 'address', computeAddress(that.publicKey))

    defineReadOnly(that, 'chainCode', chainCode)

    defineReadOnly(that, 'index', index)
    defineReadOnly(that, 'depth', depth)

    if (mnemonicOrPath == null) {
      // From a source that does not preserve the path (e.g. extended keys)
      defineReadOnly(that, 'mnemonic', null)
      defineReadOnly(that, 'path', null)
    } else if (typeof mnemonicOrPath === 'string') {
      // From a source that does not preserve the mnemonic (e.g. neutered)
      defineReadOnly(that, 'mnemonic', null)
      defineReadOnly(that, 'path', mnemonicOrPath)
    } else {
      // From a fully qualified source
      defineReadOnly(that, 'mnemonic', mnemonicOrPath)
      defineReadOnly(that, 'path', mnemonicOrPath.path)
    }

    return that
  }

  private _derive(index: number): HDNode {
    if (index > 0xffffffff) {
      throw new Error('invalid index - ' + String(index))
    }

    // Base path
    let path = this.path
    if (path) {
      path += '/' + (index & ~HardenedBit)
    }

    const indexBuffer = Buffer.allocUnsafe(4)
    indexBuffer.writeUInt32BE(index, 0)

    if (!this.privateKey) {
      throw new Error('cannot derive child of neutered node')
    }
    const data = Buffer.concat([
      Buffer.alloc(1, 0),
      arrayify(this.privateKey),
      indexBuffer
    ])

    if (index & HardenedBit) {
      // Hardened path
      if (path) {
        path += "'"
      }
    }

    const I = arrayify(
      computeHmac(SupportedAlgorithm.sha512, this.chainCode, data)
    )
    const IL = I.slice(0, 32)
    const IR = I.slice(32)

    let mnemonicOrPath: Mnemonic | string = path

    const srcMnemonic = this.mnemonic
    if (srcMnemonic) {
      mnemonicOrPath = Object.freeze({
        phrase: srcMnemonic.phrase,
        path: path,
        locale: srcMnemonic.locale || 'en'
      })
    }

    return new HDNode(
      _constructorGuard,
      bytes32(IL),
      '',
      this.fingerprint,
      bytes32(IR),
      index,
      this.depth + 1,
      mnemonicOrPath
    )
  }

  // @ts-ignore
  derivePath(path: string): HDNode {
    const components = path.split('/')

    if (
      components.length === 0 ||
      (components[0] === 'm' && this.depth !== 0)
    ) {
      throw new Error('invalid path - ' + path)
    }

    if (components[0] === 'm') {
      components.shift()
    }

    let result: HDNode = this
    for (let i = 0; i < components.length; i++) {
      const component = components[i]
      if (!component.match(/^[0-9]+'$/)) {
        // As per SLIP-0010, all derivation-path indexes must be hardened.
        throw new Error('invalid path component - ' + component)
      }
      const index = parseInt(component.substring(0, component.length - 1))
      if (index >= HardenedBit) {
        throw new Error('invalid path index - ' + component)
      }
      result = result._derive(HardenedBit + index)
    }

    const privateKeyBuf = Buffer.from(arrayify(result.privateKey))
    const keyPair = sign.keyPair.fromSeed(privateKeyBuf)
    defineReadOnly(result, 'secretKey', hexlify(keyPair.secretKey))
    return result
  }

  unhardenedIndex() {
    return this.index - HardenedBit
  }

  static _fromSeed(seed: BytesLike, mnemonic: Mnemonic | null): HDNode {
    const seedArray: Uint8Array = arrayify(seed)
    if (seedArray.length < 16 || seedArray.length > 64) {
      throw new Error('invalid seed')
    }

    const { key, chainCode } = getMasterKeyFromSeed(hexlify(seed).substring(2))

    return new HDNode(
      _constructorGuard,
      bytes32(key),
      '',
      '0x00000000',
      bytes32(chainCode),
      0,
      0,
      mnemonic
    )
  }

  static fromMnemonic(
    mnemonic: string,
    password?: string,
    wordlist?: string | Wordlist
  ): HDNode {
    // If a locale name was passed in, find the associated wordlist
    wordlist = getWordlist(wordlist)

    // Normalize the case and spacing in the mnemonic (throws if the mnemonic is invalid)
    mnemonic = entropyToMnemonic(
      mnemonicToEntropy(mnemonic, wordlist),
      wordlist
    )

    return HDNode._fromSeed(mnemonicToSeed(mnemonic, password), {
      phrase: mnemonic,
      path: 'm',
      locale: wordlist.locale
    })
  }

  static fromSeed(seed: BytesLike): HDNode {
    return HDNode._fromSeed(seed, null)
  }

  static fromExtendedKey(extendedKey: string): HDNode {
    const that = Object.create(HDNode.prototype)
    Object.assign(that, BaseHDNode.fromExtendedKey(extendedKey))
    return that
  }
}
