import { NetworkKind } from '~lib/network'
import { ChainId } from '~lib/schema'

// https://api.coingecko.com/api/v3/asset_platforms
export const PLATFORMS = new Map<NetworkKind, Map<ChainId, string>>([
  [
    NetworkKind.EVM,
    new Map([
      [361, 'theta'],
      [10, 'optimistic-ethereum'],
      [42170, 'arbitrum-nova'],
      [106, 'velas'],
      [333999, 'polis-chain'],
      [8545, 'shiden network'],
      [57, 'syscoin'],
      [122, 'fuse'],
      [321, 'kucoin-community-chain'],
      [128, 'huobi-token'],
      [42161, 'arbitrum-one'],
      [56, 'binance-smart-chain'],
      [66, 'okex-chain'],
      [250, 'fantom'],
      [88, 'tomochain'],
      [82, 'meter'],
      [137, 'polygon-pos'],
      [1285, 'moonriver'],
      [25, 'cronos'],
      [10000, 'smartbch'],
      [1313161554, 'aurora'],
      [1666600000, 'harmony-shard-0'],
      [43114, 'avalanche'],
      [1088, 'metis-andromeda'],
      [100, 'xdai'],
      [1, 'ethereum'],
      [2001, 'milkomeda-cardano'],
      [9001, 'evmos'],
      [288, 'boba'],
      [42220, 'celo'],
      [52, 'coinex-smart-chain'],
      [108, 'thundercore'],
      [50, 'xdc-network'],
      [1284, 'moonbeam'],
      [70, 'hoo-smart-chain'],
      [42262, 'oasis'],
      [7700, 'canto']
    ])
  ],
  // TODO
  [NetworkKind.COSM, new Map([])]
])
