import { hexlify } from '@ethersproject/bytes'
import { Keypair } from '@solana/web3.js'
import { AptosAccount } from 'aptos'
import bs58 from 'bs58'
import { arrayify } from 'ethers/lib/utils'

import { HDNode } from './ed25519'

interface HDNodeTestVector {
  path: string
  fingerprint: string
  chainCode: string
  privateKey: string
  publicKey: string
}

describe("ED25519 'DNode", () => {
  it('', () => {
    const seed = '0x000102030405060708090a0b0c0d0e0f'

    const cases: HDNodeTestVector[] = [
      {
        path: 'm',
        fingerprint: '00000000',
        chainCode:
          '90046a93de5380a72b5e45010748567d5ea02bbf6522f979e05c0d8d8ca9fffb',
        privateKey:
          '2b4be7f19ee27bbf30c667b642d5f4aa69fd169872f8fc3059c08ebae2eb19e7',
        publicKey:
          '00a4b2856bfec510abab89753fac1ac0e1112364e7d250545963f135f2a33188ed'
      },
      {
        path: "m/0'",
        fingerprint: 'ddebc675',
        chainCode:
          '8b59aa11380b624e81507a27fedda59fea6d0b779a778918a2fd3590e16e9c69',
        privateKey:
          '68e0fe46dfb67e368c75379acec591dad19df3cde26e63b93a8e704f1dade7a3',
        publicKey:
          '008c8a13df77a28f3445213a0f432fde644acaa215fc72dcdf300d5efaa85d350c'
      },
      {
        path: "m/0'/1'",
        fingerprint: '13dab143',
        chainCode:
          'a320425f77d1b5c2505a6b1b27382b37368ee640e3557c315416801243552f14',
        privateKey:
          'b1d0bad404bf35da785a64ca1ac54b2617211d2777696fbffaf208f746ae84f2',
        publicKey:
          '001932a5270f335bed617d5b935c80aedb1a35bd9fc1e31acafd5372c30f5c1187'
      },
      {
        path: "m/0'/1'/2'",
        fingerprint: 'ebe4cb29',
        chainCode:
          '2e69929e00b5ab250f49c3fb1c12f252de4fed2c1db88387094a0f8c4c9ccd6c',
        privateKey:
          '92a5b23c0b8a99e37d07df3fb9966917f5d06e02ddbd909c7e184371463e9fc9',
        publicKey:
          '00ae98736566d30ed0e9d2f4486a64bc95740d89c7db33f52121f8ea8f76ff0fc1'
      },
      {
        path: "m/0'/1'/2'/2'",
        fingerprint: '316ec1c6',
        chainCode:
          '8f6d87f93d750e0efccda017d662a1b31a266e4a6f5993b15f5c1f07f74dd5cc',
        privateKey:
          '30d1dc7e5fc04c31219ab25a27ae00b50f6fd66622f6e9c913253d6511d1e662',
        publicKey:
          '008abae2d66361c879b900d204ad2cc4984fa2aa344dd7ddc46007329ac76c429c'
      },
      {
        path: "m/0'/1'/2'/2'/1000000000'",
        fingerprint: 'd6322ccd',
        chainCode:
          '68789923a0cac2cd5a29172a475fe9e0fb14cd6adb5ad98a3fa70333e7afa230',
        privateKey:
          '8f94d394a8e8fd6b1bc2f3f49f5c47e385281d5c17e65324b0f62483e37e8793',
        publicKey:
          '003c24da049451555d51a7014a37337aa4e12d41e485abccfa46b47dfb2af54b7a'
      }
    ]

    const node = HDNode.fromSeed(seed)
    console.log(node)
    console.log(node.extendedKey)

    for (const c of cases) {
      const derived = node.derivePath(c.path)
      expect(derived.parentFingerprint.substring(2)).toEqual(c.fingerprint)
      expect(derived.chainCode.substring(2)).toEqual(c.chainCode)
      expect(derived.privateKey.substring(2)).toEqual(c.privateKey)
      expect(derived.publicKey.substring(2)).toEqual(c.publicKey.substring(2))
    }

    const sol = Keypair.fromSeed(arrayify(node.privateKey))
    console.log(
      'solana:',
      hexlify(sol.secretKey),
      hexlify(sol.publicKey.toBuffer())
    )

    const aptos = new AptosAccount(arrayify(node.privateKey))
    console.log(
      'aptos:',
      hexlify(aptos.signingKey.secretKey),
      aptos.pubKey().hex(),
      aptos.address().hex()
    )
  })
})
