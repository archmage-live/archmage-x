import { NativeCurrency } from './evm'

export interface SuiChainInfo {
  name: string
  isTestnet?: boolean
  currency: NativeCurrency
  rpc: string[]
  explorers: string[]
  faucets?: string[]
}

export const SUI_NETWORKS_PRESET: SuiChainInfo[] = [
  {
    name: 'Sui Devnet',
    isTestnet: true,
    currency: {
      name: 'Sui',
      symbol: 'SUI',
      decimals: 9
    },
    rpc: ['https://fullnode.devnet.sui.io'],
    explorers: ['https://explorer.devnet.sui.io'],
    faucets: ['https://faucet.devnet.sui.io']
  },
  {
    name: 'Sui Localhost',
    isTestnet: true,
    currency: {
      name: 'Sui',
      symbol: 'SUI',
      decimals: 9
    },
    rpc: ['http://127.0.0.1:9000'],
    explorers: ['http://localhost:3000'],
    faucets: ['http://127.0.0.1:5003']
  }
]
