import type { IdentifierString } from '@wallet-standard/base'

import { NativeCurrency } from './evm'

export interface SolanaChainInfo {
  name: string
  isTestnet?: boolean
  chainId: IdentifierString
  currency: NativeCurrency
  rpc: string[]
  explorers: string[]
  faucets?: string[]
}

export const SOLANA_NETWORKS_PRESET: SolanaChainInfo[] = [
  {
    name: 'Solana Mainnet',
    chainId: 'solana:mainnet',
    currency: {
      name: 'Sol',
      symbol: 'SOL',
      decimals: 9
    },
    rpc: ['https://api.mainnet-beta.solana.com'],
    explorers: ['https://solscan.io', 'https://explorer.solana.com']
  },
  {
    name: 'Solana Testnet',
    chainId: 'solana:testnet',
    currency: {
      name: 'Sol',
      symbol: 'SOL',
      decimals: 9
    },
    rpc: ['https://api.testnet.solana.com'],
    explorers: [
      'https://solscan.io/?cluster=testnet',
      'https://explorer.solana.com/?cluster=testnet'
    ],
    faucets: ['https://faucet.solana.com']
  },
  {
    name: 'Solana Devnet',
    chainId: 'solana:devnet',
    currency: {
      name: 'Sol',
      symbol: 'SOL',
      decimals: 9
    },
    rpc: ['https://api.devnet.solana.com'],
    explorers: [
      'https://solscan.io/?cluster=devnet',
      'https://explorer.solana.com/?cluster=devnet'
    ],
    faucets: ['https://faucet.solana.com']
  },
  {
    name: 'Solana Localnet',
    chainId: 'solana:localnet',
    currency: {
      name: 'Sol',
      symbol: 'SOL',
      decimals: 9
    },
    rpc: ['http://localhost:8899'],
    explorers: []
  }
]
