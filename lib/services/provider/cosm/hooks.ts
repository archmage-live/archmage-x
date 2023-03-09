import { Secp256k1Pubkey, StdSignDoc, pubkeyType } from '@cosmjs/amino'
import { toBase64 } from '@cosmjs/encoding'
import { TxBodyEncodeObject, makeAuthInfoBytes } from '@cosmjs/proto-signing'
import { arrayify } from '@ethersproject/bytes'
import { ABCIMessageLog } from 'cosmjs-types/cosmos/base/abci/v1beta1/abci'
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing'
import {
  AuthInfo,
  SignDoc,
  Tx,
  TxBody,
  TxRaw
} from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { useAsync, useAsyncRetry, useInterval } from 'react-use'

import { CosmAppChainInfo } from '~lib/network/cosm'
import { encodeEthSecp256k1Pubkey } from '~lib/network/cosm/amino'
import { createDefaultAminoTypes } from '~lib/network/cosm/modules/amino'
import { createDefaultRegistry } from '~lib/network/cosm/modules/registry'
import { Dec } from '~lib/network/cosm/number'
import { getOsmosisQueryClient } from '~lib/network/cosm/osmosis/client'
import { computeOsmosisTxFeeAmount } from '~lib/network/cosm/osmosis/txfees'
import { encodePubkey } from '~lib/network/cosm/proto-signing'
import { IChainAccount, INetwork } from '~lib/schema'
import { COSMOS_CHAIN_REGISTRY_API } from '~lib/services/datasource/cosmos'
import { getCosmClient } from '~lib/services/provider/cosm/client'
import { Amount } from '~lib/services/token'
import { getSigningWallet, isStdSignDoc } from '~lib/wallet'

export function useCosmTransaction(
  network?: INetwork,
  account?: IChainAccount,
  signDoc?: SignDoc | StdSignDoc
): { tx: Tx; gasUsed?: number; logs?: ABCIMessageLog[] } | undefined {
  const { value, loading, retry } = useAsyncRetry(async () => {
    if (!network || !account?.address || !signDoc) {
      return
    }
    const client = await getCosmClient(network)
    if (!client) {
      return
    }

    const { tx, txRaw } = (await makeCosmTx(signDoc, network, account)) || {}
    if (!tx || !txRaw) {
      return
    }

    const { gasInfo, result } = await client
      .getQueryClient()
      .tx.simulateTx(txRaw)
    return {
      tx,
      gasUsed: gasInfo?.gasUsed.toNumber(),
      logs: result?.log
        ? (JSON.parse(result?.log) as ABCIMessageLog[])
        : undefined
    }
  }, [network, account, signDoc])

  useInterval(retry, !loading ? 5000 : null)

  return value
}

interface CosmTxFeeAmount {
  amount: string
  amountParticle: string
}

export interface CosmTxFee {
  denom: string
  symbol: string
  decimals: number
  low: CosmTxFeeAmount
  average: CosmTxFeeAmount
  high: CosmTxFeeAmount
}

export const CosmPriceSteps = ['low', 'average', 'high'] as [
  'low',
  'average',
  'high'
]

export function useCosmTxFees(
  network?: INetwork,
  gas?: number
): CosmTxFee[] | undefined {
  const { value } = useAsync(async () => {
    if (!network || gas === undefined) {
      return
    }
    const client = await getCosmClient(network)
    if (!client) {
      return
    }

    const info = network.info as CosmAppChainInfo

    const baseFeeCurrency = info.feeCurrencies[0]
    if (!baseFeeCurrency.gasPriceStep) {
      return
    }
    const gasPriceStep = baseFeeCurrency.gasPriceStep

    const baseTxFee = {
      denom: baseFeeCurrency.coinMinimalDenom,
      symbol: baseFeeCurrency.coinDenom,
      decimals: baseFeeCurrency.coinDecimals
    } as CosmTxFee

    for (const step of CosmPriceSteps) {
      const amountParticle = new Dec(gasPriceStep[step]).mul(gas)
      baseTxFee[step] = {
        amount: amountParticle.divPow(baseTxFee.decimals).toString(),
        amountParticle: amountParticle.toString()
      }
    }

    const txFees: CosmTxFee[] = [baseTxFee]

    if (info.chainId.startsWith('osmosis')) {
      const assetList = await COSMOS_CHAIN_REGISTRY_API.getOsmosisAssetList(
        info.chainId
      )

      const queryClient = getOsmosisQueryClient(client)
      const { feeTokens } = await queryClient.osmosis.txfees.v1beta1.feeTokens()

      for (const { denom } of feeTokens) {
        const asset = assetList?.assets.find(({ base }) => {
          return base === denom
        })
        if (!asset) {
          continue
        }
        const denomUnit = asset.denom_units.find((denomUnit) => {
          return denomUnit.denom === asset.display
        })
        if (!denomUnit) {
          continue
        }
        const { spotPrice } =
          await queryClient.osmosis.txfees.v1beta1.denomSpotPrice({ denom })

        const txFee = {
          denom,
          symbol: asset.symbol,
          decimals: denomUnit.exponent
        } as CosmTxFee

        for (const step of CosmPriceSteps) {
          const amountParticle = computeOsmosisTxFeeAmount(
            gasPriceStep[step],
            gas,
            denom,
            new Dec(spotPrice)
          )
          txFee[step].amountParticle = amountParticle
          txFee[step].amount = new Dec(amountParticle)
            .divPow(txFee.decimals)
            .toString()
        }

        txFees.push(txFee)
      }
    }

    return txFees
  }, [network, gas])

  return value
}

export async function makeCosmTx(
  signDoc: SignDoc | StdSignDoc,
  network: INetwork,
  account: IChainAccount
): Promise<{ tx: Tx; txRaw: TxRaw } | undefined> {
  const client = await getCosmClient(network)
  if (!client) {
    return
  }

  const info = network.info as CosmAppChainInfo

  let txRaw: TxRaw
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

    let pubKey
    const wallet = await getSigningWallet(account)
    if (wallet?.publicKey) {
      pubKey = encodeEthSecp256k1Pubkey(arrayify(wallet.publicKey))
    } else if (account.address) {
      const client = await getCosmClient(network)
      const acc = await client.getAccount(account.address)
      if (acc) {
        pubKey = acc.pubkey
      }
    }
    if (!pubKey) {
      // cannot find public key, so fake it
      pubKey = {
        type: pubkeyType.secp256k1,
        value: toBase64(new Uint8Array()) // empty
      } as Secp256k1Pubkey
    }
    const pubkey = encodePubkey(pubKey)

    const signedAuthInfoBytes = makeAuthInfoBytes(
      [{ pubkey, sequence: Number(signDoc.sequence) }],
      signDoc.fee.amount,
      Number(signDoc.fee.gas),
      signDoc.fee.granter,
      signDoc.fee.payer,
      SignMode.SIGN_MODE_LEGACY_AMINO_JSON
    )

    txRaw = TxRaw.fromPartial({
      bodyBytes: signedTxBodyBytes,
      authInfoBytes: signedAuthInfoBytes,
      signatures: [new Uint8Array()]
    })
  } else {
    txRaw = TxRaw.fromPartial({
      bodyBytes: signDoc.bodyBytes,
      authInfoBytes: signDoc.authInfoBytes,
      signatures: [new Uint8Array()]
    })
  }

  const tx = Tx.fromPartial({
    body: TxBody.decode(txRaw.bodyBytes),
    authInfo: AuthInfo.decode(txRaw.authInfoBytes),
    signatures: txRaw.signatures
  })

  return {
    tx,
    txRaw
  }
}
