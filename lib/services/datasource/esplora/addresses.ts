import { fetchJson } from '~lib/fetch'

export async function getAddress(params: { address: string }) {
  return (await fetchJson(`/address/${params.address}`)) as {
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

export async function getScriphash(params: { hash: string }) {
  return (await fetchJson(`/scripthash/${params.hash}`)) as {
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

export async function getAddressTxs(params: { address: string }) {
  return (await fetchJson(`/address/${params.address}/txs`)) as {
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

export async function getAddressTxsChain(params: { address: string }) {
  return (await fetchJson(`/address/${params.address}/txs/chain`)) as {
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

export async function getAddressTxsMempool(params: { address: string }) {
  return await fetchJson(`/address/${params.address}/txs/mempool`)
}

export async function getAddressTxsUtxo(params: { address: string }) {
  return (await fetchJson(`/address/${params.address}/utxo`)) as {
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
