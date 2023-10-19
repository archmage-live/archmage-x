import { Interface } from '@ethersproject/abi'
import { BigNumberish } from '@ethersproject/bignumber'

export function parseTransaction(
  iface: Interface,
  data: string,
  value?: BigNumberish
) {
  return iface.parseTransaction({
    data,
    value
  })
}
