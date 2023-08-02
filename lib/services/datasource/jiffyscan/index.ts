import assert from 'assert'

import { fetchJson } from '~lib/fetch'
import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'
import { UserOperationResponse } from '~lib/services/provider/evm'

export const JIFFYSCAN_NETWORKS: Map<number, string> = new Map([
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

// https://jiffyscan.readme.io/reference/getting-started-1
// https://github.com/jiffy-labs/jiffyscan-frontend/blob/master/src/components/common/apiCalls/jiffyApis.tsx
export interface AccountUserOp {
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
  userOps: AccountUserOp[]
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

export interface UserOps {
  userOps: UserOp[]
}

export interface UserOp {
  id: string | null
  transactionHash: string | null
  userOpHash: string
  sender: string
  accountSender: { factory: string }
  paymaster: string
  nonce: number | string
  actualGasCost: number | string
  gasPrice: number | string
  actualGasUsed: number | string | null
  success: Boolean
  revertReason: string | null
  blockTime: number | string | null
  blockNumber: number | string | null
  network: string
  input: string | null
  target: string | string[] | null
  accountTarget: { factory: string }
  callData: string | string[] | null
  beneficiary: string | null
  factory: string | null
  value: number | string | number[] | string[] | null
  verificationGasLimit: string | null
  preVerificationGas: string | null
  callGasLimit: string | null
  gasLimit: string | null
  maxFeePerGas: number | string | null
  maxPriorityFeePerGas: number | string | null
  baseFeePerGas: number | string | null
  paymasterAndData: string | null
  signature: string | null
  entryPoint: string
  preDecodedCallData: string | null
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

class JiffyscanApi {
  private static baseUrl = 'https://api.jiffyscan.xyz/v0'

  private async fetch(
    network: INetwork,
    url: string,
    params: Record<string, any>
  ) {
    assert(network.kind === NetworkKind.EVM)
    const networkName = JIFFYSCAN_NETWORKS.get(Number(network.chainId))
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
  ): Promise<[UserOperationResponse, UserOp] | undefined> {
    const userOps: UserOps = await this.fetch(network, '/getUserOp', {
      hash: userOpHash
    })
    if (!Array.isArray(userOps.userOps) || !userOps.userOps.length) {
      return
    }

    const userOp = userOps.userOps[0]

    let decoded
    if (Array.isArray(userOp.target)) {
      assert(Array.isArray(userOp.value) && Array.isArray(userOp.callData))
      decoded = userOp.target.map((target, i) => ({
        to: target,
        value: (userOp.value as (number | string)[])[i].toString(),
        data: (userOp.callData as string[])[i]
      }))
    } else {
      assert(!Array.isArray(userOp.value) && !Array.isArray(userOp.callData))
      decoded = [
        {
          to: userOp.target || undefined,
          value: userOp.value?.toString(),
          data: userOp.callData || undefined
        }
      ]
    }

    const userOperationResponse: UserOperationResponse = {
      sender: userOp.sender as any,
      nonce: userOp.nonce as any,
      initCode: '0x', // TODO: how to get initCode from jiffyscan?
      callData: (userOp.preDecodedCallData || '0x') as any,
      callGasLimit: userOp.callGasLimit as any,
      verificationGasLimit: userOp.verificationGasLimit as any,
      preVerificationGas: userOp.preVerificationGas as any,
      maxFeePerGas: userOp.maxFeePerGas as any,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas as any,
      paymasterAndData: userOp.paymasterAndData as any,
      signature: userOp.signature as any,
      entryPoint: userOp.entryPoint as any,
      blockNumber: userOp.blockNumber as any,
      blockHash: undefined, // TODO: how to get blockHash from jiffyscan?
      transactionHash: userOp.transactionHash as any,
      timestamp: userOp.blockTime ? Number(userOp.blockTime) : undefined,
      hash: userOp.userOpHash,
      factory: userOp.factory || undefined,
      decodedCallData: decoded
    }

    return [userOperationResponse, userOp]
  }
}

export const JIFFYSCAN_API = new JiffyscanApi()
