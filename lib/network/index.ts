export enum NetworkKind {
  EVM = 'evm',
  COSM = 'cosm',
  APTOS = 'aptos',
  SUI = 'sui',
  SOL = 'sol'
}

export const NETWORK_SCOPES = [
  'Ethereum',
  // 'Cosmos',
  'Aptos',
  'Sui'
  // 'Solana'
]
export const NETWORK_SCOPE_ANY = 'Any Network Kind'

export type NetworkScope = typeof NETWORK_SCOPES[number]

const NETWORK_KINDS: {
  [key in NetworkScope]: NetworkKind | undefined
} = {
  Ethereum: NetworkKind.EVM,
  Cosmos: NetworkKind.COSM,
  Aptos: NetworkKind.APTOS,
  Sui: NetworkKind.SUI,
  Solana: NetworkKind.SOL
}

export function getNetworkKind(scope?: NetworkScope): NetworkKind {
  return NETWORK_KINDS[scope as any]!
}

export function getNetworkScope(kind: NetworkKind): NetworkScope {
  switch (kind) {
    case NetworkKind.EVM:
      return 'Ethereum'
    case NetworkKind.COSM:
      return 'Cosmos'
    case NetworkKind.APTOS:
      return 'Aptos'
    case NetworkKind.SUI:
      return 'Sui'
    case NetworkKind.SOL:
      return 'Solana'
  }
}
