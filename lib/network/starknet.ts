import { StarknetChainId } from 'starknet/constants'

import { NativeCurrency } from '~lib/network/evm'

export interface StarknetChainInfo {
  name: string
  isTestnet?: boolean
  chainId: string
  currency: NativeCurrency
  rpc: string[]
  explorers: string[]
  faucets?: string[]
  accountContracts: StarknetAccountContract[]
  readonly?: boolean
}

interface StarknetAccountContract {
  name: string
  hash: string
}

export const STARKNET_NETWORKS_PRESET: StarknetChainInfo[] = [
  {
    name: 'StarkNet Mainnet',
    chainId: StarknetChainId.MAINNET, // 'SN_MAIN'
    currency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpc: ['https://alpha-mainnet.starknet.io'],
    explorers: ['https://starkscan.co', 'https://voyager.online'],
    accountContracts: [
      {
        name: 'Argent',
        hash: '0x3e327de1c40540b98d05cbcb13552008e36f0ec8d61d46956d2f9752c294328'
      }
    ],
    readonly: true
  },
  {
    name: 'StarkNet Goerli',
    isTestnet: true,
    chainId: StarknetChainId.TESTNET, // 'SN_GOERLI'
    currency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpc: ['https://alpha4.starknet.io'],
    explorers: [
      'https://testnet.starkscan.co',
      'https://goerli.voyager.online'
    ],
    accountContracts: [
      {
        name: 'Argent',
        hash: '0x3e327de1c40540b98d05cbcb13552008e36f0ec8d61d46956d2f9752c294328'
      }
    ],
    readonly: true
  }
]
