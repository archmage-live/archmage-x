import { crypto } from '@noble/hashes/crypto'
import * as bitcoin from 'bitcoinjs-lib'

import { NativeCurrency } from './evm'

export interface BtcChainInfo {
  name: string
  isTestnet?: boolean
  chainId: string // https://en.bitcoin.it/wiki/BIP_0122
  currency: NativeCurrency
  rpc: string[]
  explorers: string[]
  faucets?: string[]
  network: bitcoin.Network
}

export const BTC_NETWORKS_PRESET: BtcChainInfo[] = [
  {
    name: 'Bitcoin',
    isTestnet: false,
    // https://blockstream.info/api/block-height/0
    chainId: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
    currency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 8
    },
    rpc: ['https://blockstream.info/api'],
    explorers: ['https://blockstream.info'],
    network: bitcoin.networks.bitcoin
  },
  {
    name: 'Bitcoin Testnet',
    isTestnet: true,
    // https://blockstream.info/testnet/api/block-height/0
    chainId: '000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943',
    currency: {
      name: 'tBitcoin',
      symbol: 'tBTC',
      decimals: 8
    },
    rpc: ['https://blockstream.info/testnet/api'],
    explorers: ['https://blockstream.info/testnet'],
    faucets: ['https://bitcoinfaucet.uo1.net'],
    network: bitcoin.networks.testnet
  }
]
