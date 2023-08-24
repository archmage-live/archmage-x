import { constants } from 'starknet'

import { NativeCurrency } from '~lib/network/evm'

export const STARKNET_ETH_TOKEN_ADDRESS =
  '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'

export interface StarknetChainInfo {
  name: string
  shortName: string
  isTestnet?: boolean
  chainId: string
  currency: NativeCurrency & { address?: string }
  baseUrl: string // sequencer url
  rpcs?: string[]
  explorers: string[]
  faucets?: string[]
  accountClassHash: StarknetAccountClassHash[]
  multicallAddress?: string
  readonly?: boolean
}

interface StarknetAccountClassHash {
  name: string
  hash: string
}

export const STARKNET_NETWORKS_PRESET: StarknetChainInfo[] = [
  {
    name: 'StarkNet Mainnet',
    shortName: constants.NetworkName.SN_MAIN,
    chainId: constants.StarknetChainId.SN_MAIN,
    currency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    baseUrl: 'https://alpha-mainnet.starknet.io',
    explorers: ['https://starkscan.co', 'https://voyager.online'],
    accountClassHash: [
      {
        name: 'Argent Account',
        hash: '0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2'
      }
    ],
    multicallAddress:
      '0x05754af3760f3356da99aea5c3ec39ccac7783d925a19666ebbeca58ff0087f4',
    readonly: true
  },
  {
    name: 'StarkNet Goerli',
    shortName: constants.NetworkName.SN_GOERLI,
    isTestnet: true,
    chainId: constants.StarknetChainId.SN_GOERLI,
    currency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    baseUrl: 'https://alpha4.starknet.io',
    explorers: [
      'https://testnet.starkscan.co',
      'https://goerli.voyager.online'
    ],
    accountClassHash: [
      {
        name: 'Argent Account',
        hash: '0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2'
      },
      {
        name: 'Argent Plugin Account',
        hash: '0x4ee23ad83fb55c1e3fac26e2cd951c60abf3ddc851caa9a7fbb9f5eddb2091'
      },
      {
        name: 'Argent Better Multicall Account',
        hash: '0x057c2f22f0209a819e6c60f78ad7d3690f82ade9c0c68caea492151698934ede'
      }
    ],
    multicallAddress:
      '0x05754af3760f3356da99aea5c3ec39ccac7783d925a19666ebbeca58ff0087f4',
    readonly: true
  },
  {
    name: 'StarkNet Goerli 2',
    shortName: constants.NetworkName.SN_GOERLI2,
    isTestnet: true,
    chainId: constants.StarknetChainId.SN_GOERLI2,
    currency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    baseUrl: 'https://alpha4-2.starknet.io',
    explorers: [
      'https://testnet-2.starkscan.co',
      'https://goerli-2.voyager.online'
    ],
    accountClassHash: [
      {
        name: 'Argent Account',
        hash: '0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2'
      },
      {
        name: 'Argent Plugin Account',
        hash: '0x4ee23ad83fb55c1e3fac26e2cd951c60abf3ddc851caa9a7fbb9f5eddb2091'
      },
      {
        name: 'Argent Better Multicall Account',
        hash: '0x057c2f22f0209a819e6c60f78ad7d3690f82ade9c0c68caea492151698934ede'
      }
    ],
    multicallAddress:
      '0x05754af3760f3356da99aea5c3ec39ccac7783d925a19666ebbeca58ff0087f4',
    readonly: true
  }
]
