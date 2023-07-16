import assert from 'assert'

import { fetchJson } from '~lib/fetch'
import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'

// https://jiffyscan.readme.io/reference/getting-started-1
// https://github.com/jiffy-labs/jiffyscan-frontend/blob/master/src/components/common/apiCalls/jiffyApis.tsx
export interface UserOp {
  id: string | null
  transactionHash: string | null
  userOpHash: string
  sender: string
  accountSender: { factory: string }
  paymaster: string
  nonce: number | string
  actualGasCost: number | string
  actualGasPrice: number | string
  actualGasUsed: number | string | null
  success: Boolean
  revertReason: string | null
  blockTime: number | string | null
  blockNumber: number | string | null
  network: string
  input: string | null
  target: string | null
  accountTarget: { factory: string }
  callData: string | null
  beneficiary: string | null
  factory: string | null
  value: number | string | null
  verificationGasLimit: string | null
  preVerificationGas: string | null
  maxFeePerGas: number | string | null
  maxPriorityFeePerGas: number | string | null
  paymasterAndData: string | null
  signature: string | null
  entryPoint: string
  erc20Transfers: {
    contractAddress: string
    from: string
    to: string
    value: string
    decimals: string
    name: string
    symbol: string
  }
  erc721Transfers: {
    contractAddress: string
    from: string
    to: string
    tokenId: string
    decimals: string
    name: string
    symbol: string
  }
}

export interface AccountDetail {
  userOps: UserOp[]
  userOpsCount: string
  id: string
  address: string
  network: string
  blockTime: string
  blockNumber: string
  factory: string
  paymaster: string
  userOpHash: string
  totalDeposits: string
}

export interface AddressActivity {
  accountDetail: AccountDetail
}

class JiffyscanApi {
  private static baseUrl = 'https://api.jiffyscan.xyz/v0'

  private static networks: Map<number, string> = new Map([
    [1, 'mainnet'],
    [5, 'georli'],
    [11155111, 'sepolia'],
    [137, 'matic'],
    [80001, 'mumbai'],
    [10, 'optimism'],
    [420, 'optimism-goerli'],
    [42161, 'arbitrum-one'],
    [421613, 'arbitrum-goerli'],
    [56, 'bsc'],
    [43114, 'avalanche'],
    [43113, 'avalanche-testnet'],
    [250, 'fantom'],
    [4002, 'fantom-testnet'],
    [84531, 'base-testnet'],
    [100, 'gnosis']
  ])

  private async fetch(
    network: INetwork,
    url: string,
    params: Record<string, any>
  ) {
    assert(network.kind === NetworkKind.EVM)
    const networkName = JiffyscanApi.networks.get(Number(network.chainId))
    if (!networkName) {
      return
    }

    const apiKey = process.env.PLASMO_PUBLIC_JIFFYSCAN_API_KEY
    if (!apiKey) {
      return
    }

    const u = new URL(`${JiffyscanApi.baseUrl}${url}`)
    u.searchParams.set('network', networkName)
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v.toString())
    }

    return await fetchJson({
      url: u.toString(),
      headers: {
        'x-api-key': apiKey
      }
    })
  }

  async getAddressActivity(
    network: INetwork,
    address: string,
    offset: number = 0,
    limit: number = 10
  ): Promise<AddressActivity | undefined> {
    return await this.fetch(network, '/getAddressActivity', {
      address,
      first: limit,
      skip: offset
    })
  }

  async getUserOp(
    network: INetwork,
    userOpHash: string
  ): Promise<UserOp | undefined> {
    return await this.fetch(network, '/getUserOp', { hash: userOpHash })
  }
}

export const JIFFYSCAN_API = new JiffyscanApi()
