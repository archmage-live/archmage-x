import type { Bech32Config, ChainInfo } from '@keplr-wallet/types'

class Bech32Address {
  static defaultBech32Config(
    mainPrefix: string,
    validatorPrefix: string = 'val',
    consensusPrefix: string = 'cons',
    publicPrefix: string = 'pub',
    operatorPrefix: string = 'oper'
  ): Bech32Config {
    return {
      bech32PrefixAccAddr: mainPrefix,
      bech32PrefixAccPub: mainPrefix + publicPrefix,
      bech32PrefixValAddr: mainPrefix + validatorPrefix + operatorPrefix,
      bech32PrefixValPub:
        mainPrefix + validatorPrefix + operatorPrefix + publicPrefix,
      bech32PrefixConsAddr: mainPrefix + validatorPrefix + consensusPrefix,
      bech32PrefixConsPub:
        mainPrefix + validatorPrefix + consensusPrefix + publicPrefix
    }
  }
}

export const CoinGeckoAPIEndPoint = 'https://api.coingecko.com/api/v3'

export const EthereumEndpoint =
  'https://mainnet.infura.io/v3/eeb00e81cdb2410098d5a270eff9b341'

export interface AppChainInfo extends ChainInfo {
  readonly hideInUI?: boolean
  readonly txExplorer?: {
    readonly name: string
    readonly txUrl: string
  }
}

export type CosmAppChainInfo = AppChainInfo & {
  isTestnet?: boolean
}

export const COSM_NETWORKS_PRESET: CosmAppChainInfo[] = [
  {
    bech32Config: {
      bech32PrefixAccAddr: 'cosmos',
      bech32PrefixAccPub: 'cosmospub',
      bech32PrefixConsAddr: 'cosmosvalcons',
      bech32PrefixConsPub: 'cosmosvalconspub',
      bech32PrefixValAddr: 'cosmosvaloper',
      bech32PrefixValPub: 'cosmosvaloperpub'
    },
    bip44: {
      coinType: 118
    },
    chainId: 'cosmoshub-4',
    chainName: 'Cosmos Hub',
    chainSymbolImageUrl:
      'https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/cosmoshub/chain.png',
    currencies: [
      {
        coinDecimals: 6,
        coinDenom: 'ATOM',
        coinGeckoId: 'cosmos',
        coinMinimalDenom: 'uatom'
      }
    ],
    features: [],
    feeCurrencies: [
      {
        coinDecimals: 6,
        coinDenom: 'ATOM',
        coinGeckoId: 'cosmos',
        coinMinimalDenom: 'uatom',
        gasPriceStep: {
          average: 0.025,
          high: 0.03,
          low: 0.01
        }
      }
    ],
    rest: 'https://lcd-cosmoshub.keplr.app',
    rpc: 'https://rpc-cosmoshub.keplr.app',
    stakeCurrency: {
      coinDecimals: 6,
      coinDenom: 'ATOM',
      coinGeckoId: 'cosmos',
      coinMinimalDenom: 'uatom'
    },
    walletUrlForStaking: 'https://wallet.keplr.app/chains/cosmos-hub'
  },
  {
    rpc: 'https://rpc-osmosis.keplr.app',
    rest: 'https://lcd-osmosis.keplr.app',
    chainId: 'osmosis-1',
    chainName: 'Osmosis',
    chainSymbolImageUrl:
      'https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/osmosis/chain.png',
    stakeCurrency: {
      coinDenom: 'OSMO',
      coinMinimalDenom: 'uosmo',
      coinDecimals: 6,
      coinGeckoId: 'osmosis'
    },
    walletUrl: 'https://app.osmosis.zone',
    walletUrlForStaking: 'https://wallet.keplr.app/chains/osmosis',
    bip44: {
      coinType: 118
    },
    bech32Config: {
      bech32PrefixAccAddr: 'osmo',
      bech32PrefixAccPub: 'osmopub',
      bech32PrefixValAddr: 'osmovaloper',
      bech32PrefixValPub: 'osmovaloperpub',
      bech32PrefixConsAddr: 'osmovalcons',
      bech32PrefixConsPub: 'osmovalconspub'
    },
    currencies: [
      {
        coinDenom: 'OSMO',
        coinMinimalDenom: 'uosmo',
        coinDecimals: 6,
        coinGeckoId: 'osmosis'
      },
      {
        coinDenom: 'ION',
        coinMinimalDenom: 'uion',
        coinDecimals: 6,
        coinGeckoId: 'ion'
      }
    ],
    feeCurrencies: [
      {
        coinDenom: 'OSMO',
        coinMinimalDenom: 'uosmo',
        coinDecimals: 6,
        coinGeckoId: 'osmosis',
        gasPriceStep: {
          low: 0,
          average: 0.025,
          high: 0.04
        }
      }
    ],
    features: ['cosmwasm', 'osmosis-txfees']
  },
  {
    rpc: 'https://rpc-secret.keplr.app',
    rest: 'https://lcd-secret.keplr.app',
    chainId: 'secret-4',
    chainName: 'Secret Network',
    chainSymbolImageUrl:
      'https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/secret/chain.png',
    stakeCurrency: {
      coinDenom: 'SCRT',
      coinMinimalDenom: 'uscrt',
      coinDecimals: 6,
      coinGeckoId: 'secret'
    },
    walletUrl: 'https://wallet.keplr.app/chains/secret-network',
    walletUrlForStaking: 'https://wallet.keplr.app/chains/secret-network',
    bip44: {
      coinType: 529
    },
    alternativeBIP44s: [
      {
        coinType: 118
      }
    ],
    bech32Config: {
      bech32PrefixAccAddr: 'secret',
      bech32PrefixAccPub: 'secretpub',
      bech32PrefixValAddr: 'secretvaloper',
      bech32PrefixValPub: 'secretvaloperpub',
      bech32PrefixConsAddr: 'secretvalcons',
      bech32PrefixConsPub: 'secretvalconspub'
    },
    currencies: [
      {
        coinDenom: 'SCRT',
        coinMinimalDenom: 'uscrt',
        coinDecimals: 6,
        coinGeckoId: 'secret'
      }
    ],
    feeCurrencies: [
      {
        coinDenom: 'SCRT',
        coinMinimalDenom: 'uscrt',
        coinDecimals: 6,
        coinGeckoId: 'secret',
        gasPriceStep: {
          low: 0.0125,
          average: 0.1,
          high: 0.25
        }
      }
    ],
    coinType: 529,
    features: ['secretwasm']
  },
  {
    rpc: 'https://rpc-evmos.keplr.app',
    rest: 'https://lcd-evmos.keplr.app',
    chainId: 'evmos_9001-2',
    chainName: 'Evmos',
    chainSymbolImageUrl:
      'https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/evmos_9001/chain.png',
    stakeCurrency: {
      coinDenom: 'EVMOS',
      coinMinimalDenom: 'aevmos',
      coinDecimals: 18,
      coinGeckoId: 'evmos'
    },
    walletUrl: 'https://wallet.keplr.app/chains/evmos',
    walletUrlForStaking: 'https://wallet.keplr.app/chains/evmos',
    bip44: {
      coinType: 60
    },
    bech32Config: {
      bech32PrefixAccAddr: 'evmos',
      bech32PrefixAccPub: 'evmospub',
      bech32PrefixValAddr: 'evmosvaloper',
      bech32PrefixValPub: 'evmosvaloperpub',
      bech32PrefixConsAddr: 'evmosvalcons',
      bech32PrefixConsPub: 'evmosvalconspub'
    },
    currencies: [
      {
        coinDenom: 'EVMOS',
        coinMinimalDenom: 'aevmos',
        coinDecimals: 18,
        coinGeckoId: 'evmos'
      }
    ],
    feeCurrencies: [
      {
        coinDenom: 'EVMOS',
        coinMinimalDenom: 'aevmos',
        coinDecimals: 18,
        coinGeckoId: 'evmos',
        gasPriceStep: {
          low: 25000000000,
          average: 25000000000,
          high: 40000000000
        }
      }
    ],
    features: ['eth-address-gen', 'eth-key-sign']
  },
  {
    rpc: 'https://rpc-juno.keplr.app',
    rest: 'https://lcd-juno.keplr.app',
    chainId: 'juno-1',
    chainName: 'Juno',
    chainSymbolImageUrl:
      'https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/juno/chain.png',
    stakeCurrency: {
      coinDenom: 'JUNO',
      coinMinimalDenom: 'ujuno',
      coinDecimals: 6,
      coinGeckoId: 'juno-network'
    },
    walletUrl: 'https://wallet.keplr.app/chains/juno',
    walletUrlForStaking: 'https://wallet.keplr.app/chains/juno',
    bip44: {
      coinType: 118
    },
    bech32Config: {
      bech32PrefixAccAddr: 'juno',
      bech32PrefixAccPub: 'junopub',
      bech32PrefixValAddr: 'junovaloper',
      bech32PrefixValPub: 'junovaloperpub',
      bech32PrefixConsAddr: 'junovalcons',
      bech32PrefixConsPub: 'junovalconspub'
    },
    currencies: [
      {
        coinDenom: 'JUNO',
        coinMinimalDenom: 'ujuno',
        coinDecimals: 6,
        coinGeckoId: 'juno-network'
      }
    ],
    feeCurrencies: [
      {
        coinDenom: 'JUNO',
        coinMinimalDenom: 'ujuno',
        coinDecimals: 6,
        coinGeckoId: 'juno-network',
        gasPriceStep: {
          low: 0.001,
          average: 0.0025,
          high: 0.004
        }
      },
      {
        coinDenom: 'ATOM',
        coinMinimalDenom:
          'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
        coinDecimals: 6,
        gasPriceStep: {
          low: 0.00033,
          average: 0.0008250000000000001,
          high: 0.00132
        }
      }
    ],
    features: ['cosmwasm']
  },
  {
    rpc: 'https://rpc-kava.keplr.app',
    rest: 'https://lcd-kava.keplr.app',
    chainId: 'kava_2222-10',
    chainName: 'Kava',
    chainSymbolImageUrl:
      'https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/kava_2222/chain.png',
    stakeCurrency: {
      coinDenom: 'KAVA',
      coinMinimalDenom: 'ukava',
      coinDecimals: 6,
      coinGeckoId: 'kava'
    },
    walletUrl: 'https://wallet.keplr.app/chains/kava',
    walletUrlForStaking: 'https://wallet.keplr.app/chains/kava',
    bip44: {
      coinType: 459
    },
    alternativeBIP44s: [
      {
        coinType: 118
      }
    ],
    bech32Config: {
      bech32PrefixAccAddr: 'kava',
      bech32PrefixAccPub: 'kavapub',
      bech32PrefixValAddr: 'kavavaloper',
      bech32PrefixValPub: 'kavavaloperpub',
      bech32PrefixConsAddr: 'kavavalcons',
      bech32PrefixConsPub: 'kavavalconspub'
    },
    currencies: [
      {
        coinDenom: 'KAVA',
        coinMinimalDenom: 'ukava',
        coinDecimals: 6,
        coinGeckoId: 'kava'
      },
      {
        coinDenom: 'SWP',
        coinMinimalDenom: 'swp',
        coinDecimals: 6,
        coinGeckoId: 'kava-swap'
      },
      {
        coinDenom: 'USDX',
        coinMinimalDenom: 'usdx',
        coinDecimals: 6,
        coinGeckoId: 'usdx'
      },
      {
        coinDenom: 'HARD',
        coinMinimalDenom: 'hard',
        coinDecimals: 6
      },
      {
        coinDenom: 'BNB',
        coinMinimalDenom: 'bnb',
        coinDecimals: 8
      },
      {
        coinDenom: 'BTCB',
        coinMinimalDenom: 'btcb',
        coinDecimals: 8
      },
      {
        coinDenom: 'BUSD',
        coinMinimalDenom: 'busd',
        coinDecimals: 8
      },
      {
        coinDenom: 'XRPB',
        coinMinimalDenom: 'xrpb',
        coinDecimals: 8
      }
    ],
    feeCurrencies: [
      {
        coinDenom: 'KAVA',
        coinMinimalDenom: 'ukava',
        coinDecimals: 6,
        coinGeckoId: 'kava',
        gasPriceStep: {
          low: 0.05,
          average: 0.1,
          high: 0.25
        }
      }
    ],
    coinType: 459
  }
]

export const AmplitudeApiKey = 'dbcaf47e30aae5b712bda7f892b2f0c4'
