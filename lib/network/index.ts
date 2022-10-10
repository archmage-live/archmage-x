export enum NetworkKind {
  EVM = 'evm',
  COSM = 'cosm',
  APTOS = 'aptos',
  SOL = 'sol'
}

export const NETWORK_SCOPES = [
  'EVM',
  // 'Cosmos',
  'Aptos'
  // 'Solana'
]
export const NETWORK_SCOPE_ANY = 'Any Network Kind'

export type NetworkScope = typeof NETWORK_SCOPES[number]

const NETWORK_KINDS: {
  [key in NetworkScope]: NetworkKind | undefined
} = {
  EVM: NetworkKind.EVM,
  Cosmos: NetworkKind.COSM,
  Aptos: NetworkKind.APTOS,
  Solana: NetworkKind.SOL
}

export function getNetworkKind(scope?: NetworkScope): NetworkKind {
  return NETWORK_KINDS[scope as any]!
}

export function getNetworkScope(kind: NetworkKind): NetworkScope {
  switch (kind) {
    case NetworkKind.EVM:
      return 'EVM'
    case NetworkKind.COSM:
      return 'Cosmos'
    case NetworkKind.APTOS:
      return 'Aptos'
    case NetworkKind.SOL:
      return 'Solana'
  }
}
