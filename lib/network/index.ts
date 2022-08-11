export enum NetworkType {
  EVM = 'evm',
  COSM = 'cosm',
  OTHER = 'other'
}

export const NETWORK_SCOPES = ['All', 'EVM', 'Cosm', 'Other']

export type NetworkScope = typeof NETWORK_SCOPES[number]

const NETWORK_TYPES: { [key in NetworkScope]: NetworkType | undefined } = {
  All: undefined,
  EVM: NetworkType.EVM,
  Cosm: NetworkType.COSM,
  Other: NetworkType.OTHER
}

export function getNetworkType(scope: NetworkScope): NetworkType | undefined {
  return NETWORK_TYPES[scope]
}

export enum NetworkKind {
  EVM = 'evm',
  COSM = 'cosm',
  SOL = 'sol'
}

export const NETWORK_KIND_SCOPES = ['EVM', 'Cosmos', 'Solana']
export const NETWORK_KIND_SCOPE_ANY = 'Any Network Kind'

export type NetworkKindScope = typeof NETWORK_KIND_SCOPES[number]

const NETWORK_KIND_TYPES: {
  [key in NetworkKindScope]: NetworkKind | undefined
} = {
  EVM: NetworkKind.EVM,
  Cosmos: NetworkKind.COSM,
  Solana: NetworkKind.SOL
}

export function getNetworkKind(scope?: NetworkKindScope): NetworkKind {
  return NETWORK_KIND_TYPES[scope as any]!
}
