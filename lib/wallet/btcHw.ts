import ecc from '@bitcoinerlab/secp256k1'
import assert from 'assert'
import * as bitcoin from 'bitcoinjs-lib'
import ECPairFactory from 'ecpair'

import { getLedgerBtcApp, toAddressFormat } from '~lib/hardware/ledger'
import { DerivePosition } from '~lib/schema'
import { BtcTxParams } from '~lib/services/provider/btc'

import {
  BtcAddressType,
  HardwareWalletType,
  SigningWallet,
  WalletPathSchema,
  generatePath
} from '.'
import { HARDWARE_MISMATCH } from './evmHw'

export class BtcHwWallet implements SigningWallet {
  path: string

  constructor(
    public hwType: HardwareWalletType,
    public hwHash: string,
    public address: string,
    public addressType: BtcAddressType,
    public network: bitcoin.Network,
    public pathSchema: WalletPathSchema,
    pathOrIndex: string | number,
    public publicKey?: string
  ) {
    if (typeof pathOrIndex === 'string') {
      this.path = pathOrIndex
    } else {
      this.path = generatePath(
        pathSchema.pathTemplate,
        pathOrIndex,
        pathSchema.derivePosition
      )
    }
  }

  private async getLedgerApp() {
    const addressFormat = toAddressFormat(this.addressType)
    const [appBtc, hwHash] = await getLedgerBtcApp({
      ...this.pathSchema!,
      addressFormat
    })
    assert(
      this.hwHash === this.address || hwHash === this.hwHash,
      HARDWARE_MISMATCH
    )
    const { bitcoinAddress: address } = await appBtc.getWalletPublicKey(
      this.path,
      {
        format: addressFormat
      }
    )
    assert(address === this.address, HARDWARE_MISMATCH)
    return appBtc
  }

  async signTransaction(transaction: BtcTxParams): Promise<string> {
    const appBtc = await this.getLedgerApp()
    const psbt = bitcoin.Psbt.fromHex(transaction.psbt!, {
      network: this.network
    })

    const tx = (psbt as any).__CACHE.__TX as bitcoin.Transaction
    const splitTx = await appBtc.splitTransaction(tx.toHex(), tx.hasWitnesses())
    const outputScriptHex = appBtc
      .serializeTransactionOutputs(splitTx)
      .toString('hex')

    const inputs = psbt.txInputs.map((input, i) => {
      const inp = psbt.data.inputs[i]
      const inputTx = bitcoin.Transaction.fromHex(transaction.inputTxs[i])
      const inLedgerTx = appBtc.splitTransaction(
        inputTx.toHex(),
        inputTx.hasWitnesses()
      )
      type Params = Parameters<
        typeof appBtc.signP2SHTransaction
      >[0]['inputs'][number]
      return [
        inLedgerTx,
        input.index,
        inp.redeemScript?.toString('hex'),
        input.sequence
      ] as Params
    })

    const sign = async (path: string, publicKey: Buffer) => {
      const signer: bitcoin.SignerAsync = {
        network: this.network,
        publicKey,
        sign: async (hash) => {
          const signatures = await appBtc.signP2SHTransaction({
            inputs,
            associatedKeysets: [path],
            outputScriptHex,
            segwit: tx.hasWitnesses()
          })
          const signature = signatures[0]
          const encodedSignature = (() => {
            if (tx.hasWitnesses()) {
              return Buffer.from(signature, 'hex')
            }
            return Buffer.concat([
              Buffer.from(signature, 'hex'),
              Buffer.from('01', 'hex')
            ])
          })()
          const decoded = bitcoin.script.signature.decode(encodedSignature)
          return decoded.signature
        }
      }
      await psbt.signAllInputsAsync(signer)
    }

    if (transaction.subAccounts) {
      for (const acc of transaction.subAccounts) {
        const publicKey = Buffer.from(acc.publicKey, 'hex')

        const path1 = generatePath(
          this.path,
          acc.changeIndex,
          DerivePosition.CHANGE
        )
        const path2 = generatePath(
          path1,
          acc.addressIndex,
          DerivePosition.ADDRESS_INDEX
        )

        await sign(path2, publicKey)
      }
    } else {
      const publicKey = Buffer.from(this.publicKey!, 'hex')
      await sign(this.path, publicKey)
    }

    const ECPair = ECPairFactory(ecc)

    const validator = (
      pubkey: Buffer,
      msghash: Buffer,
      signature: Buffer
    ): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature)

    assert(psbt.validateSignaturesOfAllInputs(validator))

    psbt.finalizeAllInputs()
    return psbt.extractTransaction().toHex()
  }

  async signMessage(message: any): Promise<any> {
    throw new Error('not implemented')
  }

  async signTypedData(typedData: any): Promise<any> {
    throw new Error('not implemented')
  }
}
