import { arrayify } from '@ethersproject/bytes'
import { toUtf8String } from '@ethersproject/strings'

import { fetchData, fetchJson } from '~lib/fetch'

export interface EsploraStatus {
  confirmed: boolean
  block_height: number
  block_hash: string
  block_time: number
}

export interface EsploraTxVin {
  txid: string
  vout: number
  is_coinbase: boolean
  scriptsig: string
  scriptsig_asm: string
  inner_redeemscript_asm: string
  inner_witnessscript_asm: string
  sequence: number
  witness: string[]
  prevout: EsploraTxVout
}

export interface EsploraTxVout {
  scriptpubkey: string
  scriptpubkey_asm: string
  scriptpubkey_type:  'p2pkh' | 'p2sh' | 'v0_p2wpkh' | 'v0_p2wsh' | 'v1_p2tr' | 'op_return' | 'fee'
  scriptpubkey_address: string
  value: number
}

export interface EsploraTx {
  txid: string
  version: number
  locktime: number
  size: number
  weight: number
  fee: number
  vin: EsploraTxVin[]
  vout: EsploraTxVout[]
  status: EsploraStatus
}

// https://github.com/Blockstream/esplora/blob/master/API.md
export class EsploraApi {
  baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/')
      ? baseUrl.slice(0, baseUrl.length - 1)
      : baseUrl
  }

  async getBlock(params: { hash: string }) {
    return (await fetchJson(`${this.baseUrl}/block/${params.hash}`)) as {
      id: string
      height: number
      version: number
      timestamp: number
      tx_count: number
      size: number
      weight: number
      merkle_root: string
      previousblockhash: string
      mediantime: number
      nonce: number
      bits: number
      difficulty: number
    }
  }

  async getBlockHeader(params: { hash: string }) {
    return await fetchData(
      `${this.baseUrl}/block/${params.hash}/header`,
      undefined,
      (value) => toUtf8String(value)
    )
  }

  async getBlockStatus(params: { hash: string }) {
    return (await fetchJson(`${this.baseUrl}/block/${params.hash}/status`)) as {
      in_best_chain: boolean
      height: number
      next_best: string
    }
  }

  async getBlockTxs(params: { hash: string; start_index?: number }) {
    return (await fetchJson(
      `${this.baseUrl}/block/${params.hash}/txs/${params.start_index}`
    )) as {
      txid: string
      version: number
      locktime: number
      vin: Record<string, unknown>[]
      vout: Record<string, unknown>[][]
      size: number
      weight: number
      fee: number
      status: {
        confirmed: boolean
        block_height: number
        block_hash: string
        block_time: number
      }
    }
  }

  async getBlockTxids(params: { hash: string }) {
    return (await fetchJson(
      `${this.baseUrl}/block/${params.hash}/txids`
    )) as string[]
  }

  async getBlockTxid(params: { hash: string; index: number }) {
    return await fetchData(
      `${this.baseUrl}/block/${params.hash}/txid/${params.index}`,
      undefined,
      (value) => toUtf8String(value)
    )
  }

  async getBlockRaw(params: { hash: string }) {
    return await fetchData(
      `${this.baseUrl}/block/${params.hash}/raw`,
      undefined,
      (value) => toUtf8String(value)
    )
  }

  async getBlockHeight(params: { start_height: number }) {
    return await fetchData(
      `${this.baseUrl}/block-height/${params.start_height}`,
      undefined,
      (value) => toUtf8String(value)
    )
  }

  async getBlocks(params: { start_height?: number }) {
    return (await fetchJson(
      `${this.baseUrl}/blocks/${params.start_height}`
    )) as {
      id: string
      height: number
      version: number
      timestamp: number
      tx_count: number
      size: number
      weight: number
      merkle_root: string
      previousblockhash: string
      mediantime: number
      nonce: number
      bits: number
      difficulty: number
    }[]
  }

  async getBlocksTipHeight() {
    return await fetchData(
      `${this.baseUrl}/blocks/tip/height`,
      undefined,
      (value) => Number(toUtf8String(value))
    )
  }

  async getBlocksTipHash() {
    return await fetchData(
      `${this.baseUrl}/blocks/tip/hash`,
      undefined,
      (value) => toUtf8String(value)
    )
  }

  async getTx(params: { txid: string }) {
    return (await fetchJson(`${this.baseUrl}/tx/${params.txid}`)) as EsploraTx
  }

  async getTxStatus(params: { txid: string }) {
    return (await fetchJson(
      `${this.baseUrl}/tx/${params.txid}/status`
    )) as EsploraStatus
  }

  async getTxHex(params: { txid: string }) {
    return await fetchData(
      `${this.baseUrl}/tx/${params.txid}/hex`,
      undefined,
      (value) => toUtf8String(value)
    )
  }

  async getTxRaw(params: { txid: string }) {
    return await fetchData(`${this.baseUrl}/tx/${params.txid}/raw`)
  }

  async getTxMerkleBlockProof(params: { txid: string }) {
    return await fetchData(
      `${this.baseUrl}/tx/${params.txid}/merkleblock-proof`,
      undefined,
      (value) => toUtf8String(value)
    )
  }

  async getTxMerkleProof(params: { txid: string }) {
    return (await fetchJson(
      `${this.baseUrl}/tx/${params.txid}/merkle-proof`
    )) as {
      block_height: number
      merkle: string[]
      pos: number
    }
  }

  async getTxOutspend(params: { txid: string; vout: number }) {
    return (await fetchJson(
      `${this.baseUrl}/tx/${params.txid}/outspend/${params.vout}`
    )) as {
      spent: boolean
      txid: string
      vin: number
      status: {
        confirmed: boolean
        block_height: number
        block_hash: string
        block_time: number
      }
    }
  }

  async getTxOutspends(params: { txid: string }) {
    return (await fetchJson(`${this.baseUrl}/tx/${params.txid}/outspends`)) as {
      spent: boolean
      txid: string
      vin: number
      status: {
        confirmed: boolean
        block_height: number
        block_hash: string
        block_time: number
      }
    }[]
  }

  async postTx(tx: string | Uint8Array) {
    return await fetchData(`${this.baseUrl}/tx`, arrayify(tx), (value) =>
      toUtf8String(value)
    )
  }

  async getFeeEstimates() {
    return (await fetchJson(`${this.baseUrl}/fee-estimates`)) as Record<
      string,
      number
    >
  }

  async getAddress(params: { address: string }) {
    return (await fetchJson(`${this.baseUrl}/address/${params.address}`)) as {
      address: string
      chain_stats: {
        funded_txo_count: number
        funded_txo_sum: number
        spent_txo_count: number
        spent_txo_sum: number
        tx_count: number
      }
      mempool_stats: {
        funded_txo_count: number
        funded_txo_sum: number
        spent_txo_count: number
        spent_txo_sum: number
        tx_count: number
      }
    }
  }

  async getScriphash(params: { hash: string }) {
    return (await fetchJson(`${this.baseUrl}/scripthash/${params.hash}`)) as {
      chain_stats: {
        funded_txo_count: number
        funded_txo_sum: number
        spent_txo_count: number
        spent_txo_sum: number
        tx_count: number
      }
      mempool_stats: {
        funded_txo_count: number
        funded_txo_sum: number
        spent_txo_count: number
        spent_txo_sum: number
        tx_count: number
      }
      scripthash: string
    }
  }

  async getAddressTxs(params: { address: string }) {
    return (await fetchJson(
      `${this.baseUrl}/address/${params.address}/txs`
    )) as {
      txid: string
      version: number
      locktime: number
      vin: Record<string, unknown>[]
      vout: Record<string, unknown>[]
      size: number
      weight: number
      fee: number
      status: {
        confirmed: boolean
        block_height: number
        block_hash: string
        block_time: number
      }
    }[]
  }

  async getAddressTxsChain(params: { address: string; lastSeenTxid: string }) {
    return (await fetchJson(
      `${this.baseUrl}/address/${params.address}/txs/chain/${params.lastSeenTxid}`
    )) as {
      txid: string
      version: number
      locktime: number
      vin: Record<string, unknown>[]
      vout: Record<string, unknown>[]
      size: number
      weight: number
      fee: number
      status: {
        confirmed: boolean
        block_height: number
        block_hash: string
        block_time: number
      }
    }[]
  }

  async getAddressTxsMempool(params: { address: string }) {
    return await fetchJson(
      `${this.baseUrl}/address/${params.address}/txs/mempool`
    )
  }

  async getAddressTxsUtxo(params: { address: string }) {
    return (await fetchJson(
      `${this.baseUrl}/address/${params.address}/utxo`
    )) as {
      txid: string
      vout: number
      status: {
        confirmed: boolean
        block_height: number
        block_hash: string
        block_time: number
      }
      value: number
    }[]
  }

  async getAsset(params: { asset_id: string }) {
    return (await fetchJson(`${this.baseUrl}/asset/${params.asset_id}`)) as {
      asset_id: string
      chain_stats: {
        tx_count: number
        peg_in_count: number
        peg_in_amount: number
        peg_out_count: number
        peg_out_amount: number
        burn_count: number
        burned_amount: number
      }
      mempool_stats: {
        tx_count: number
        peg_in_count: number
        peg_in_amount: number
        peg_out_count: number
        peg_out_amount: number
        burn_count: number
        burned_amount: number
      }
    }
  }

  async getAssetTxs(params: { asset_id: string }) {
    return (await fetchJson(
      `${this.baseUrl}/asset/${params.asset_id}/txs`
    )) as {
      txid: string
      version: number
      locktime: number
      vin: Object[]
      vout: Object[]
      size: number
      weight: number
      fee: number
      status: {
        confirmed: boolean
        block_height: number
        block_hash: string
        block_time: number
      }
    }[]
  }

  async getAssetTxsMempool(params: { asset_id: string }) {
    return (await fetchJson(
      `${this.baseUrl}/asset/${params.asset_id}/txs/mempool`
    )) as {
      txid: string
      version: number
      locktime: number
      vin: Object[]
      vout: Object[]
      size: number
      weight: number
      fee: number
      status: {
        confirmed: boolean
        block_height: number
        block_hash: string
        block_time: number
      }
    }[]
  }

  async getAssetTxsChain(params: { asset_id: string; last_seen?: string }) {
    return (await fetchJson(
      `${this.baseUrl}/asset/${params.asset_id}/txs/chain/${params.last_seen}`
    )) as {
      txid: string
      version: number
      locktime: number
      vin: Object[]
      vout: Object[]
      size: number
      weight: number
      fee: number
      status: {
        confirmed: boolean
        block_height: number
        block_hash: string
        block_time: number
      }
    }[]
  }

  async getAssetSupply(params: { asset_id: string }) {
    return await fetchData(
      `${this.baseUrl}/asset/${params.asset_id}/supply`,
      undefined,
      (value) => Number(toUtf8String(value))
    )
  }

  async getAssetSupplyDecimal(params: { asset_id: string }) {
    return await fetchData(
      `${this.baseUrl}/asset/${params.asset_id}/supply/decimal`,
      undefined,
      (value) => Number(toUtf8String(value))
    )
  }

  async getAssetRegistry(params?: {
    start_index?: number
    limit?: number
    sort_field?: string
    sort_dir?: string
  }) {
    return (await fetchJson(
      `${this.baseUrl}/assets/registry`,
      JSON.stringify({ params })
    )) as {
      asset_id: string
      issuance_txin: {
        txid: string
        vin: number
      }
      issuance_prevout: {
        txid: string
        vout: number
      }
      reissuance_token: string
      contract_hash: string
      status: {
        confirmed: boolean
        block_height: number
        block_hash: string
        block_time: number
      }
      chain_stats: {
        tx_count: number
        issuance_count: number
        issued_amount: number
        burned_amount: number
        has_blinded_issuances: false
        reissuance_tokens: number
        burned_reissuance_tokens: number
      }
      mempool_stats: {
        tx_count: number
        issuance_count: number
        issued_amount: number
        burned_amount: number
        has_blinded_issuances: false
        reissuance_tokens: string
        burned_reissuance_tokens: number
      }
      contract: {
        entity: Object[]
        issuer_pubkey: string
        name: string
        precision: number
        ticker: string
        version: number
      }
      entity: { domain: string }
      precision: number
      name: string
      ticker: string
    }[]
  }
}
