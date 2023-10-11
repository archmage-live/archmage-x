import { NativeCurrency } from './evm'

export interface AleoNetworkInfo {
  name: string
  isTestnet?: boolean
  networkId: number
  currency: NativeCurrency
  rpc: string[]
  explorers: string[]
  faucets?: string[]
}

export const ALEO_NETWORKS_PRESET: AleoNetworkInfo[] = [
  {
    name: 'Aleo Testnet 3',
    networkId: 3,
    currency: {
      name: 'Aleo',
      symbol: 'ALEO',
      decimals: 6
    },
    rpc: ['https://vm.aleo.org/api'],
    explorers: ['https://explorer.aleo.org'],
    faucets: ['https://faucet.aleo.org']
  }
]
