import { toUtf8String } from '@ethersproject/strings'

import { fetchData, fetchJson } from '~lib/fetch'

export async function getAsset(params: { asset_id: string }) {
  return (await fetchJson(`/asset/${params.asset_id}`)) as {
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

export async function getAssetTxs(params: { asset_id: string }) {
  return (await fetchJson(`/asset/${params.asset_id}/txs`)) as {
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

export async function getAssetTxsMempool(params: { asset_id: string }) {
  return (await fetchJson(`/asset/${params.asset_id}/txs/mempool`)) as {
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

export async function getAssetTxsChain(params: {
  asset_id: string
  last_seen?: string
}) {
  return (await fetchJson(
    `/asset/${params.asset_id}/txs/chain/${params.last_seen}`
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

export async function getAssetSupply(params: { asset_id: string }) {
  return await fetchData(
    `/asset/${params.asset_id}/supply`,
    undefined,
    (value) => Number(toUtf8String(value))
  )
}

export async function getAssetSupplyDecimal(params: { asset_id: string }) {
  return await fetchData(
    `/asset/${params.asset_id}/supply/decimal`,
    undefined,
    (value) => Number(toUtf8String(value))
  )
}

export async function getAssetRegistry(params?: {
  start_index?: number
  limit?: number
  sort_field?: string
  sort_dir?: string
}) {
  return (await fetchJson(`/assets/registry`, JSON.stringify({ params }))) as {
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
