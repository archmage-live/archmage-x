import { toUtf8String } from '@ethersproject/strings'

import { fetchData, fetchJson } from '~lib/fetch'

export async function getBlock(params: { hash: string }) {
  return (await fetchJson(`/block/${params.hash}`)) as {
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

export async function getBlockHeader(params: { hash: string }) {
  return await fetchData(`/block/${params.hash}/header`, undefined, (value) =>
    toUtf8String(value)
  )
}

export async function getBlockStatus(params: { hash: string }) {
  return (await fetchJson(`/block/${params.hash}/status`)) as {
    in_best_chain: boolean
    height: number
    next_best: string
  }
}

export async function getBlockTxs(params: {
  hash: string
  start_index?: number
}) {
  return (await fetchJson(
    `/block/${params.hash}/txs/${params.start_index}`
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

export async function getBlockTxids(params: { hash: string }) {
  return (await fetchJson(`/block/${params.hash}/txids`)) as string[]
}

export async function getBlockTxid(params: { hash: string; index: number }) {
  return await fetchData(
    `/block/${params.hash}/txid/${params.index}`,
    undefined,
    (value) => toUtf8String(value)
  )
}

export async function getBlockRaw(params: { hash: string }) {
  return await fetchData(`/block/${params.hash}/raw`, undefined, (value) =>
    toUtf8String(value)
  )
}

export async function getBlockHeight(params: { start_height: number }) {
  return await fetchData(
    `/block-height/${params.start_height}`,
    undefined,
    (value) => toUtf8String(value)
  )
}

export async function getBlocks(params: { start_height?: number }) {
  return (await fetchJson(`/blocks/${params.start_height}`)) as {
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

export async function getBlocksTipHeight() {
  return await fetchData(`/blocks/tip/height`, undefined, (value) =>
    Number(toUtf8String(value))
  )
}

export async function getBlocksTipHash() {
  return await fetchData(`/blocks/tip/hash`, undefined, (value) =>
    toUtf8String(value)
  )
}
