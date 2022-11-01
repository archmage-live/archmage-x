export interface AptosChainInfo {
  name: string
  isTestnet?: boolean
  chainId: number | string
  currency: NativeCurrency
  rpc: string[]
  explorers: string[]
  faucets?: string[]
}

export interface NativeCurrency {
  name: string
  symbol: string
  decimals: number
}

export const APTOS_NETWORKS_PRESET: AptosChainInfo[] = [
  {
    name: 'Aptos Mainnet',
    isTestnet: false,
    chainId: 1,
    currency: {
      name: 'Aptos',
      symbol: 'APT',
      decimals: 8
    },
    rpc: ['https://fullnode.mainnet.aptoslabs.com'],
    explorers: ['https://explorer.aptoslabs.com', 'https://aptoscan.com']
  },
  {
    name: 'Aptos Testnet',
    isTestnet: true,
    chainId: 2,
    currency: {
      name: 'Aptos',
      symbol: 'APT',
      decimals: 8
    },
    rpc: ['https://testnet.aptoslabs.com'],
    explorers: [
      'https://explorer.aptoslabs.com/?network=testnet',
      'https://testnet.aptoscan.com'
    ],
    faucets: ['https://fullnode.testnet.aptoslabs.com/v1']
  },
  {
    name: 'Aptos Devnet',
    isTestnet: true,
    chainId: 0, // it will be set when accessing rpc
    currency: {
      name: 'Aptos',
      symbol: 'APT',
      decimals: 8
    },
    rpc: ['https://fullnode.devnet.aptoslabs.com'],
    explorers: [
      'https://explorer.aptoslabs.com/?network=devnet',
      'https://devnet.aptoscan.com'
    ],
    faucets: ['https://fullnode.devnet.aptoslabs.com/v1']
  }
  // {
  //   name: 'Aptos Localhost',
  //   isTestnet: true,
  //   chainId: 'TESTING',
  //   currency: {
  //     name: 'Aptos',
  //     symbol: 'APT',
  //     decimals: 8
  //   },
  //   rpc: ['http://localhost:8080']
  // }
]
