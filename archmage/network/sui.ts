import type { IdentifierString } from '@mysten/wallet-standard'

import { NativeCurrency } from './evm'

export interface SuiChainInfo {
  name: string
  isTestnet?: boolean
  chainId: IdentifierString
  currency: NativeCurrency
  rpc: string[]
  explorers: string[]
  faucets?: string[]
}

export const SUI_NETWORKS_PRESET: SuiChainInfo[] = [
  {
    name: 'Sui Mainnet',
    chainId: 'sui:mainnet',
    currency: {
      name: 'Sui',
      symbol: 'SUI',
      decimals: 9
    },
    rpc: ['https://wallet-rpc.mainnet.sui.io'],
    explorers: ['https://suiexplorer.com/?network=mainnet']
  },
  {
    name: 'Sui Testnet',
    isTestnet: true,
    chainId: 'sui:testnet',
    currency: {
      name: 'Sui',
      symbol: 'SUI',
      decimals: 9
    },
    rpc: ['https://wallet-rpc.testnet.sui.io'],
    explorers: ['https://suiexplorer.com/?network=testnet'],
    faucets: [
      'https://discord.com/channels/916379725201563759/1037811694564560966'
    ]
  },
  {
    name: 'Sui Devnet',
    isTestnet: true,
    chainId: 'sui:devnet',
    currency: {
      name: 'Sui',
      symbol: 'SUI',
      decimals: 9
    },
    rpc: ['https://wallet-rpc.devnet.sui.io'],
    explorers: ['https://suiexplorer.com/?network=devnet'],
    faucets: [
      'https://discordapp.com/channels/916379725201563759/971488439931392130'
    ]
  },
  {
    name: 'Sui Local',
    isTestnet: true,
    chainId: 'sui:localnet',
    currency: {
      name: 'Sui',
      symbol: 'SUI',
      decimals: 9
    },
    rpc: ['http://127.0.0.1:9000'],
    explorers: ['https://suiexplorer.com/?network=local']
  }
]
