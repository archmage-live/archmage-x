import { LOCAL_STORE, StoreKey } from '~lib/store'

export enum NetworkKind {
  BTC = 'btc',
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
if (process.env.PLASMO_PUBLIC_ENABLE_BITCOIN) {
  NETWORK_SCOPES.push('Bitcoin')
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

export type NetworkScope = typeof NETWORK_SCOPES[number]

const NETWORK_KINDS: {
  [key in NetworkScope]: NetworkKind | undefined
} = {
  Bitcoin: NetworkKind.BTC,
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

export function getNetworkScope(kind?: NetworkKind): NetworkScope {
  switch (kind) {
    case NetworkKind.BTC:
      return 'Bitcoin'
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
    default:
      return undefined!
  }
}

export async function checkNetworkKindInitialized(
  kind: NetworkKind
): Promise<boolean> {
  const networkKinds =
    (await LOCAL_STORE.get<string[]>(StoreKey.NETWORK_KINDS)) || []
  if (networkKinds.indexOf(kind) >= 0) {
    return true
  }
  networkKinds.push(kind)
  await LOCAL_STORE.set(StoreKey.NETWORK_KINDS, networkKinds)
  return false
}
