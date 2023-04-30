import { toUtf8String } from '@ethersproject/strings'

import { fetchData, fetchJson } from '~lib/fetch'

export async function getTx(params: { txid: string }) {
  return (await fetchJson(`/tx/${params.txid}`)) as {
    txid: string
    version: number
    locktime: number
    vin: {
      txid: string
      vout: number
      prevout: Record<string, unknown>
      scriptsig: string
      scriptsig_asm: string
      is_coinbase: boolean
      sequence: string
    }[]
    vout: {
      scriptpubkey: string
      scriptpubkey_asm: string
      scriptpubkey_type: string
      scriptpubkey_address: string
      value: number
    }[]
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

export async function getTxStatus(params: { txid: string }) {
  return (await fetchJson(`/tx/${params.txid}/status`)) as {
    confirmed: boolean
    block_height: number
    block_hash: string
    block_time: number
  }
}

export async function getTxHex(params: { txid: string }) {
  return await fetchData(`/tx/${params.txid}/hex`, undefined, (value) =>
    toUtf8String(value)
  )
}

export async function getTxRaw(params: { txid: string }) {
  return await fetchData(`/tx/${params.txid}/raw`)
}

export async function getTxMerkleBlockProof(params: { txid: string }) {
  return await fetchData(
    `/tx/${params.txid}/merkleblock-proof`,
    undefined,
    (value) => toUtf8String(value)
  )
}

export async function getTxMerkleProof(params: { txid: string }) {
  return (await fetchJson(`/tx/${params.txid}/merkle-proof`)) as {
    block_height: number
    merkle: string[]
    pos: number
  }
}

export async function getTxOutspend(params: { txid: string; vout: number }) {
  return (await fetchJson(`/tx/${params.txid}/outspend/${params.vout}`)) as {
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

export async function getTxOutspends(params: { txid: string }) {
  return (await fetchJson(`/tx/${params.txid}/outspends`)) as {
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

export async function postTx(params: { txid: string }) {
  return await fetchJson(`/tx`, JSON.stringify({ txid: params.txid }))
}
