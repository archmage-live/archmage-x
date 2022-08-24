import { fetchJsonWithCache } from '~lib/fetch'

type Signature = {
  createdAt: number
  signature: string
}

class FourByteApi {
  async getSignatures(fourByte: string): Promise<Signature[]> {
    const { results } = (await fetchJsonWithCache(
      `https://www.4byte.directory/api/v1/signatures/?hex_signature=${fourByte}`
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

export const FOUR_BYTE_API = new FourByteApi()
