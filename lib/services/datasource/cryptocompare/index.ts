import { fetchJSON } from '~lib/fetch'

async function fetch(url: string) {
  const body = await fetchJSON(url)
  if (body.Response === 'Error') throw new Error(body.Message)
  return body
}

class CryptoCompare {}

export const CRYPTO_COMPARE_SERVICE = new CryptoCompare()
