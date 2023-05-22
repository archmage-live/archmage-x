import {
  AminoSignResponse,
  StdSignDoc,
  encodeSecp256k1Signature,
  serializeSignDoc
} from '@cosmjs/amino'
import { Sha256 } from '@cosmjs/crypto'
import { fromBech32, toBech32 } from '@cosmjs/encoding'
import assert from 'assert'

import { getLedgerCosmApp } from '~lib/hardware/ledger'
import {
  SigningWallet,
  WalletPathSchema,
  generatePath,
  isStdSignDoc
} from '~lib/wallet'

import { HARDWARE_MISMATCH } from './evmHw'

export class CosmHwWallet implements SigningWallet {
  path: string

  constructor(
    public hwHash: string,
    public address: string,
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
    const { prefix, data } = fromBech32(this.address)

    const [appCosm, hwHash] = await getLedgerCosmApp(this.pathSchema)
    assert(
      this.hwHash === toBech32('cosmos', data) || hwHash === this.hwHash,
      HARDWARE_MISMATCH
    )
    const { address, publicKey } = await appCosm.getAddress(this.path, prefix)
    assert(address === this.address, HARDWARE_MISMATCH)
    if (this.publicKey) {
      assert(publicKey === this.publicKey, HARDWARE_MISMATCH)
    } else {
      this.publicKey = publicKey
    }
    return appCosm
  }

  async signTransaction(transaction: StdSignDoc): Promise<AminoSignResponse> {
    assert(isStdSignDoc(transaction), 'Hardware wallet can only sign Amino Doc')

    const message = new Sha256(serializeSignDoc(transaction)).digest()

    const appCosm = await this.getLedgerApp()
    const { signature, return_code } = await appCosm.sign(
      this.path,
      Buffer.from(message).toString()
    )

    if (signature === null) {
      throw new Error(return_code.toString())
    }

    return {
      signed: transaction,
      signature: encodeSecp256k1Signature(
        Buffer.from(this.publicKey!, 'hex'),
        signature
      )
    }
  }

  async signTypedData(typedData: any): Promise<string> {
    // TODO
    throw new Error('not implemented')
  }

  async signMessage(message: any): Promise<string> {
    // TODO
    throw new Error('not implemented')
  }
}
