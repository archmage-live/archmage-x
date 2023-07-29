import SafeApiKit from '@safe-global/api-kit'
import { EthersAdapter } from '@safe-global/protocol-kit'
import { SafeFactory } from '@safe-global/protocol-kit'

const SAFE_TX_SERVICE_URLS = new Map([
  [1, 'https://safe-transaction-mainnet.safe.global'],
  [5, 'https://safe-transaction-goerli.safe.global/'],
  [137, 'https://safe-transaction-polygon.safe.global/'],
  [42161, 'https://safe-transaction-arbitrum.safe.global/'],
  [10, 'https://safe-transaction-optimism.safe.global/'],
  [43114, 'https://safe-transaction-avalanche.safe.global/'],
  [56, 'https://safe-transaction-bsc.safe.global/'],
  [100, 'https://safe-transaction-gnosis-chain.safe.global/'],
  [1313161554, 'https://safe-transaction-aurora.safe.global/'],
  [84531, 'https://safe-transaction-base-testnet.safe.global/']
])
