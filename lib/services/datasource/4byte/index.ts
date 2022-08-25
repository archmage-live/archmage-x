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

export function useEvmSignature(fourBytes?: string): string | undefined {
  const { data: result } = useQuery(
    [QueryService.FOUR_BYTE, fourBytes],
    async () => fourBytes && FOURBYTE_API.getSignatures(fourBytes)
  )

  return useMemo(() => {
    if (!result || !result.length) {
      return undefined
    }

    return result[0].signature
  }, [result])
}
