import { concat, getBytes, hexlify, sha256, toBeArray } from 'ethers'

const EC_ORDER =
  '800000000000010FFFFFFFFFFFFFFFFB781126DCAE7B2321E66A241ADC64D2F'

// https://discord.com/channels/962985965889142844/966632515014123570/1100677470639894528
export function braavosKey(key0: string) {
  const N = BigInt(2) ** BigInt(256)
  const starkCurveOrder = BigInt(`0x${EC_ORDER}`)

  const N_minus_n = N - (N % starkCurveOrder)
  for (let i = 0; ; i++) {
    const x = concat([getBytes(key0), toBeArray(i)])
    const key = BigInt(hexlify(sha256(x)))
    if (key < N_minus_n) {
      return `0x${(key % starkCurveOrder).toString(16)}`
    }
  }
}
