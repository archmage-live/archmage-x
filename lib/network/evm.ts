export interface EvmChainInfo {
  name: string
  shortName: string
  chain: string
  chainId: number
  networkId: number
  rpc: string[]
  faucets: string[]
  explorers: EvmExplorer[]
  infoURL: string
  title?: string
  nativeCurrency: NativeCurrency
}

interface EvmExplorer {
  name: string
  url: string
  standard: 'EIP3091' | ''
}

interface NativeCurrency {
  name: string
  symbol: string
  decimals: number
}
