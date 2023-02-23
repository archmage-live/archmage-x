import { StdSignDoc } from '@cosmjs/amino'
import { TxBodyEncodeObject, makeAuthInfoBytes } from '@cosmjs/proto-signing'
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing'
import { SignDoc, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { Any } from 'cosmjs-types/google/protobuf/any'
import { Event } from 'cosmjs-types/tendermint/abci/types'
import Long from 'long'
import { useAsyncRetry, useInterval } from 'react-use'

import { CosmAppChainInfo } from '~lib/network/cosm'
import { createDefaultAminoTypes } from '~lib/network/cosm/modules/amino'
import { createDefaultRegistry } from '~lib/network/cosm/modules/registry'
import { IChainAccount, INetwork } from '~lib/schema'
import { getCosmClient } from '~lib/services/provider/cosm/client'
import { isStdSignDoc } from '~lib/wallet'

export function useCosmTransaction(
  network?: INetwork,
  account?: IChainAccount,
  signDoc?: SignDoc | StdSignDoc
): { gasUsed?: Long; events?: Event[] } | undefined {
  const { value, loading, retry } = useAsyncRetry(async () => {
    if (!network || !account?.address || !signDoc) {
      return
    }
    const client = await getCosmClient(network)
    if (!client) {
      return
    }

    const info = network.info as CosmAppChainInfo

    let tx: TxRaw
    if (isStdSignDoc(signDoc)) {
      const registry = createDefaultRegistry()
      const aminoTypes = createDefaultAminoTypes(
        info.bech32Config.bech32PrefixAccAddr
      )
      let signedTxBody
      try {
        signedTxBody = {
          messages: signDoc.msgs.map((msg) => aminoTypes.fromAmino(msg)),
          memo: signDoc.memo
        }
      } catch (err: any) {
        console.warn(err.toString())
        return
      }
      const signedTxBodyEncodeObject: TxBodyEncodeObject = {
        typeUrl: '/cosmos.tx.v1beta1.TxBody',
        value: signedTxBody
      }
      let signedTxBodyBytes
      try {
        signedTxBodyBytes = registry.encode(signedTxBodyEncodeObject)
      } catch (err: any) {
        console.warn(err.toString())
        return
      }

      const pubkey = {} as Any // TODO
      const signedAuthInfoBytes = makeAuthInfoBytes(
        [{ pubkey, sequence: Number(signDoc.sequence) }],
        signDoc.fee.amount,
        Number(signDoc.fee.gas),
        signDoc.fee.granter,
        signDoc.fee.payer,
        SignMode.SIGN_MODE_LEGACY_AMINO_JSON
      )

      tx = TxRaw.fromPartial({
        bodyBytes: signedTxBodyBytes,
        authInfoBytes: signedAuthInfoBytes,
        signatures: [new Uint8Array()]
      })
    } else {
      tx = TxRaw.fromPartial({
        bodyBytes: signDoc.bodyBytes,
        authInfoBytes: signDoc.authInfoBytes,
        signatures: [new Uint8Array()]
      })
    }

    const { gasInfo, result } = await client.getQueryClient().tx.simulateTx(tx)
    return {
      gasUsed: gasInfo?.gasUsed,
      events: result?.events
    }
  }, [network, account, signDoc])

  useInterval(retry, !loading ? 5000 : null)

  return value
}
