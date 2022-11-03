export enum NetworkKind {
  EVM = 'evm',
  COSM = 'cosm',
  STARKNET = 'starknet',
  APTOS = 'aptos',
  SUI = 'sui',
  SOL = 'sol'
}

export const NETWORK_SCOPES: string[] = []

if (process.env.PLASMO_PUBLIC_ENABLE_EVM) {
  NETWORK_SCOPES.push('Ethereum')
}
if (process.env.PLASMO_PUBLIC_ENABLE_COSMOS) {
  NETWORK_SCOPES.push('Cosmos')
}
if (process.env.PLASMO_PUBLIC_ENABLE_STARKNET) {
  NETWORK_SCOPES.push('StarkNet')
}
if (process.env.PLASMO_PUBLIC_ENABLE_APTOS) {
  NETWORK_SCOPES.push('Aptos')
}
if (process.env.PLASMO_PUBLIC_ENABLE_SUI) {
  NETWORK_SCOPES.push('Sui')
}
if (process.env.PLASMO_PUBLIC_ENABLE_SOLANA) {
  NETWORK_SCOPES.push('Solana')
}

export const NETWORK_SCOPE_ANY = 'Any Network Kind'

export type NetworkScope = typeof NETWORK_SCOPES[number]

const NETWORK_KINDS: {
  [key in NetworkScope]: NetworkKind | undefined
} = {
  Ethereum: NetworkKind.EVM,
  Cosmos: NetworkKind.COSM,
  StarkNet: NetworkKind.STARKNET,
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
    case NetworkKind.STARKNET:
      return 'StarkNet'
    case NetworkKind.APTOS:
      return 'Aptos'
    case NetworkKind.SUI:
      return 'Sui'
    case NetworkKind.SOL:
      return 'Solana'
  }
}
