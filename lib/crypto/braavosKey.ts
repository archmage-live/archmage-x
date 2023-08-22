import { sha256 } from '@ethersproject/sha2'
import { utils } from 'ethers'
import { constants } from 'starknet'

// https://discord.com/channels/962985965889142844/966632515014123570/1100677470639894528
export function braavosKey(key0: string) {
  const N = BigInt(2) ** BigInt(256)
  const starkCurveOrder = BigInt(`0x${constants.EC_ORDER}`)

  const N_minus_n = N - (N % starkCurveOrder)
  for (let i = 0; ; i++) {
    const x = utils.concat([utils.arrayify(key0), utils.arrayify(i)])
    const key = BigInt(utils.hexlify(sha256(x)))
    if (key < N_minus_n) {
      return `0x${(key % starkCurveOrder).toString(16)}`
    }
  }
}
