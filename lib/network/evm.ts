export interface EvmChainInfo {
  name: string
  shortName: string
  chain: string
  network?: 'testnet'
  chainId: number
  networkId: number
  rpc: string[]
  faucets?: string[]
  explorers: EvmExplorer[]
  infoURL: string
  title?: string
  nativeCurrency: NativeCurrency
  ens?: EnsRegistry
  parent?: ChainParent
}

interface EvmExplorer {
  name: string
  url: string
  standard: 'EIP3091' | 'none'
}

interface NativeCurrency {
  name: string
  symbol: string
  decimals: number
}

interface EnsRegistry {
  registry: string
}

interface ChainParent {
  type: 'L2'
  chain: string // eip155-{chainId}
  bridges: { url: string }[]
}

export const EVM_NETWORKS_PRESETS: EvmChainInfo[] = [
  {
    name: 'Ethereum Mainnet',
    chain: 'ETH',
    rpc: ['https://mainnet.infura.io/v3'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    infoURL: 'https://ethereum.org',
    shortName: 'eth',
    chainId: 1,
    networkId: 1,
    ens: { registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' },
    explorers: [
      {
        name: 'etherscan',
        url: 'https://etherscan.io',
        standard: 'EIP3091'
      }
    ]
  },
  {
    name: 'Avalanche C-Chain',
    chain: 'AVAX',
    rpc: ['https://api.avax.network/ext/bc/C/rpc'],
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    infoURL: 'https://www.avax.network/',
    shortName: 'avax',
    chainId: 43114,
    networkId: 43114,
    explorers: [
      {
        name: 'snowtrace',
        url: 'https://snowtrace.io',
        standard: 'EIP3091'
      }
    ]
  },
  {
    name: 'Polygon Mainnet',
    chain: 'Polygon',
    rpc: [
      'https://polygon-rpc.com/',
      'https://rpc-mainnet.matic.network',
      'https://matic-mainnet.chainstacklabs.com',
      'https://rpc-mainnet.maticvigil.com',
      'https://rpc-mainnet.matic.quiknode.pro',
      'https://matic-mainnet-full-rpc.bwarelabs.com'
    ],
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    infoURL: 'https://polygon.technology/',
    shortName: 'MATIC',
    chainId: 137,
    networkId: 137,
    explorers: [
      {
        name: 'polygonscan',
        url: 'https://polygonscan.com',
        standard: 'EIP3091'
      }
    ]
  },
  {
    name: 'Arbitrum One',
    chainId: 42161,
    shortName: 'arb1',
    chain: 'ETH',
    networkId: 42161,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpc: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
    explorers: [
      {
        name: 'Arbiscan',
        url: 'https://arbiscan.io',
        standard: 'EIP3091'
      },
      {
        name: 'Arbitrum Explorer',
        url: 'https://explorer.arbitrum.io',
        standard: 'EIP3091'
      }
    ],
    infoURL: 'https://arbitrum.io',
    parent: {
      type: 'L2',
      chain: 'eip155-1',
      bridges: [{ url: 'https://bridge.arbitrum.io' }]
    }
  },
  {
    name: 'Optimism',
    chain: 'ETH',
    rpc: ['https://mainnet.optimism.io/'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    infoURL: 'https://optimism.io',
    shortName: 'oeth',
    chainId: 10,
    networkId: 10,
    explorers: [
      {
        name: 'etherscan',
        url: 'https://optimistic.etherscan.io',
        standard: 'EIP3091'
      }
    ]
  },
  {
    name: 'Fantom Opera',
    chain: 'FTM',
    rpc: ['https://rpc.ftm.tools'],
    nativeCurrency: { name: 'Fantom', symbol: 'FTM', decimals: 18 },
    infoURL: 'https://fantom.foundation',
    shortName: 'ftm',
    chainId: 250,
    networkId: 250,
    explorers: [
      {
        name: 'ftmscan',
        url: 'https://ftmscan.com',
        standard: 'EIP3091'
      }
    ]
  },
  {
    name: 'Binance Smart Chain Mainnet',
    chain: 'BSC',
    rpc: [
      'https://bsc-dataseed1.binance.org',
      'https://bsc-dataseed2.binance.org',
      'https://bsc-dataseed3.binance.org',
      'https://bsc-dataseed4.binance.org',
      'https://bsc-dataseed1.defibit.io',
      'https://bsc-dataseed2.defibit.io',
      'https://bsc-dataseed3.defibit.io',
      'https://bsc-dataseed4.defibit.io',
      'https://bsc-dataseed1.ninicoin.io',
      'https://bsc-dataseed2.ninicoin.io',
      'https://bsc-dataseed3.ninicoin.io',
      'https://bsc-dataseed4.ninicoin.io',
      'wss://bsc-ws-node.nariox.org'
    ],
    nativeCurrency: {
      name: 'Binance Chain Native Token',
      symbol: 'BNB',
      decimals: 18
    },
    infoURL: 'https://www.binance.org',
    shortName: 'bnb',
    chainId: 56,
    networkId: 56,
    explorers: [
      {
        name: 'bscscan',
        url: 'https://bscscan.com',
        standard: 'EIP3091'
      }
    ]
  },
  {
    name: 'Moonbeam',
    chain: 'MOON',
    rpc: ['https://rpc.api.moonbeam.network', 'wss://wss.api.moonbeam.network'],
    nativeCurrency: { name: 'Glimmer', symbol: 'GLMR', decimals: 18 },
    infoURL: 'https://moonbeam.network/networks/moonbeam/',
    shortName: 'mbeam',
    chainId: 1284,
    networkId: 1284,
    explorers: [
      {
        name: 'moonscan',
        url: 'https://moonbeam.moonscan.io',
        standard: 'none'
      }
    ]
  },
  {
    name: 'Evmos',
    chain: 'Evmos',
    rpc: ['https://eth.bd.evmos.org:8545'],
    faucets: [],
    nativeCurrency: { name: 'Evmos', symbol: 'EVMOS', decimals: 18 },
    infoURL: 'https://evmos.org',
    shortName: 'evmos',
    chainId: 9001,
    networkId: 9001,
    explorers: [
      {
        name: 'Evmos EVM Explorer (Blockscout)',
        url: 'https://evm.evmos.org',
        standard: 'none'
      },
      {
        name: 'Evmos Cosmos Explorer (Mintscan)',
        url: 'https://www.mintscan.io/evmos',
        standard: 'none'
      }
    ]
  },
  {
    name: 'Ropsten',
    title: 'Ethereum Testnet Ropsten',
    chain: 'ETH',
    network: 'testnet',
    rpc: ['https://ropsten.infura.io/v3'],
    faucets: ['http://fauceth.komputing.org?chain=3&address=${ADDRESS}'],
    nativeCurrency: { name: 'Ropsten Ether', symbol: 'ROP', decimals: 18 },
    infoURL: 'https://github.com/ethereum/ropsten',
    shortName: 'rop',
    chainId: 3,
    networkId: 3,
    ens: { registry: '0x112234455c3a32fd11230c42e7bccd4a84e02010' },
    explorers: [
      {
        name: 'etherscan',
        url: 'https://ropsten.etherscan.io',
        standard: 'EIP3091'
      }
    ]
  },
  {
    name: 'Rinkeby',
    title: 'Ethereum Testnet Rinkeby',
    chain: 'ETH',
    network: 'testnet',
    rpc: ['https://rinkeby.infura.io/v3'],
    faucets: ['http://fauceth.komputing.org?chain=4&address=${ADDRESS}'],
    nativeCurrency: { name: 'Rinkeby Ether', symbol: 'RIN', decimals: 18 },
    infoURL: 'https://www.rinkeby.io',
    shortName: 'rin',
    chainId: 4,
    networkId: 4,
    ens: { registry: '0xe7410170f87102df0055eb195163a03b7f2bff4a' },
    explorers: [
      {
        name: 'etherscan-rinkeby',
        url: 'https://rinkeby.etherscan.io',
        standard: 'EIP3091'
      }
    ]
  },
  {
    name: 'Görli',
    title: 'Ethereum Testnet Görli',
    chain: 'ETH',
    network: 'testnet',
    rpc: [
      'https://rpc.ankr.com/eth_goerli',
      'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      'https://rpc.goerli.mudit.blog'
    ],
    faucets: [
      'http://fauceth.komputing.org?chain=5&address=${ADDRESS}',
      'https://goerli-faucet.slock.it?address=${ADDRESS}',
      'https://faucet.goerli.mudit.blog'
    ],
    nativeCurrency: { name: 'Görli Ether', symbol: 'GOR', decimals: 18 },
    infoURL: 'https://goerli.net/#about',
    shortName: 'gor',
    chainId: 5,
    networkId: 5,
    ens: { registry: '0x112234455c3a32fd11230c42e7bccd4a84e02010' },
    explorers: [
      {
        name: 'etherscan-goerli',
        url: 'https://goerli.etherscan.io',
        standard: 'EIP3091'
      }
    ]
  },
  {
    name: 'Sepolia',
    title: 'Ethereum Testnet Sepolia',
    chain: 'ETH',
    network: 'testnet',
    rpc: ['https://rpc.sepolia.org'],
    faucets: ['http://fauceth.komputing.org?chain=11155111&address=${ADDRESS}'],
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'SEP', decimals: 18 },
    infoURL: 'https://sepolia.otterscan.io',
    shortName: 'sep',
    chainId: 11155111,
    networkId: 11155111,
    explorers: [
      {
        name: 'otterscan-sepolia',
        url: 'https://sepolia.otterscan.io',
        standard: 'EIP3091'
      }
    ]
  }
]
