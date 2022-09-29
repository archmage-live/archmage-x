export enum NetworkKind {
  EVM = 'evm',
  COSM = 'cosm',
  SOL = 'sol'
}

export const NETWORK_SCOPES = ['EVM', 'Cosmos', 'Solana']
export const NETWORK_SCOPE_ANY = 'Any Network Kind'

export type NetworkScope = typeof NETWORK_SCOPES[number]

const NETWORK_KINDS: {
  [key in NetworkScope]: NetworkKind | undefined
} = {
  EVM: NetworkKind.EVM,
  Cosmos: NetworkKind.COSM,
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
    case NetworkKind.SOL:
      return 'Solana'
  }
}
