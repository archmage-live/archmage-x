export interface AptosChainInfo {
  name: string
  isTestnet?: boolean
  chainId: number | string
  currency: NativeCurrency
  rpc: string[]
  faucets?: string[]
}

export interface NativeCurrency {
  name: string
  symbol: string
  decimals: number
}

export const APTOS_NETWORKS_PRESET: AptosChainInfo[] = [
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
    faucets: ['https://fullnode.testnet.aptoslabs.com/v1']
  },
  {
    name: 'Aptos Devnet',
    isTestnet: true,
    chainId: 33,
    currency: {
      name: 'Aptos',
      symbol: 'APT',
      decimals: 8
    },
    rpc: ['https://fullnode.devnet.aptoslabs.com'],
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
