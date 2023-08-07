import { FunctionFragment } from '@ethersproject/abi'
import { hexlify } from '@ethersproject/bytes'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { fetchJsonWithCache } from '~lib/fetch'
import { QueryService } from '~lib/query'

type Signature = {
  createdAt: number
  signature: string
}

class FourByteApi {
  async getSignatures(fourBytes: string): Promise<Signature[]> {
    const { results } = (await fetchJsonWithCache(
      `https://www.4byte.directory/api/v1/signatures/?hex_signature=${fourBytes}`,
      1000 * 3600 * 24 * 7 // 7 days
    )) as { results: any[] }
    return results
      .map(
        (r) =>
          ({
            createdAt: +new Date(r.created_at),
            signature: r.text_signature
          } as Signature)
      )
      .sort((a, b) => b.createdAt - a.createdAt)
  }
}

export const FOURBYTE_API = new FourByteApi()

export function useEvmSignatureFrom4Bytes(
  fourBytes?: string
): FunctionFragment | undefined {
  const { data: result } = useQuery(
    [QueryService.FOUR_BYTE, fourBytes],
    async () =>
      fourBytes?.length === 10 && FOURBYTE_API.getSignatures(fourBytes)
  )

  return useMemo(() => {
    if (!result || !result.length) {
      return undefined
    }

    try {
      return FunctionFragment.from(result[0].signature)
    } catch (err) {
      console.error(err)
    }
  }, [result])
}

export async function getEvmSignatureFrom4Bytes(data: string) {
  if (!data) {
    return
  }
  const hex = hexlify(data)
  if (hex.length < 10) {
    return
  }

  try {
    const signatures = await FOURBYTE_API.getSignatures(hex.slice(0, 10))
    if (!signatures || !signatures.length) {
      return
    }
    return FunctionFragment.from(signatures[0].signature)
  } catch (err) {
    console.error(err)
  }
}
