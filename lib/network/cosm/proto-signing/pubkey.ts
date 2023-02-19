import {
  MultisigThresholdPubkey,
  Pubkey,
  SinglePubkey,
  encodeSecp256k1Pubkey
} from '@cosmjs/amino'
import { fromBase64 } from '@cosmjs/encoding'
import { encodePubkey as cosmEncodePubkey } from '@cosmjs/proto-signing'
import { LegacyAminoPubKey } from 'cosmjs-types/cosmos/crypto/multisig/keys'
import { PubKey } from 'cosmjs-types/cosmos/crypto/secp256k1/keys'
import { Any } from 'cosmjs-types/google/protobuf/any'

import {
  encodeEthSecp256k1Pubkey,
  isEthSecp256k1Pubkey
} from '../modules/amino'

export function encodePubkey(pubkey: Pubkey): Any {
  if (isEthSecp256k1Pubkey(pubkey)) {
    const pubkeyProto = PubKey.fromPartial({
      key: fromBase64(pubkey.value)
    })
    return Any.fromPartial({
      typeUrl: '/ethermint.crypto.v1.ethsecp256k1.PubKey',
      value: Uint8Array.from(PubKey.encode(pubkeyProto).finish())
    })
  } else {
    return cosmEncodePubkey(pubkey)
  }
}

function decodeSinglePubkey(pubkey: Any): SinglePubkey {
  switch (pubkey.typeUrl) {
    case '/ethermint.crypto.v1.ethsecp256k1.PubKey': {
      const { key } = PubKey.decode(pubkey.value)
      return encodeEthSecp256k1Pubkey(key)
    }
    case '/cosmos.crypto.secp256k1.PubKey': {
      const { key } = PubKey.decode(pubkey.value)
      return encodeSecp256k1Pubkey(key)
    }
    default:
      throw new Error(
        `Pubkey type_url ${pubkey.typeUrl} not recognized as single public key type`
      )
  }
}

export function decodePubkey(pubkey?: Any | null): Pubkey | null {
  if (!pubkey || !pubkey.value) {
    return null
  }

  switch (pubkey.typeUrl) {
    case '/ethermint.crypto.v1.ethsecp256k1.PubKey': {
      return decodeSinglePubkey(pubkey)
    }
    case '/cosmos.crypto.secp256k1.PubKey': {
      return decodeSinglePubkey(pubkey)
    }
    case '/cosmos.crypto.multisig.LegacyAminoPubKey': {
      const { threshold, publicKeys } = LegacyAminoPubKey.decode(pubkey.value)
      const out: MultisigThresholdPubkey = {
        type: 'tendermint/PubKeyMultisigThreshold',
        value: {
          threshold: threshold.toString(),
          pubkeys: publicKeys.map(decodeSinglePubkey)
        }
      }
      return out
    }
    default:
      throw new Error(`Pubkey type_url ${pubkey.typeUrl} not recognized`)
  }
}
