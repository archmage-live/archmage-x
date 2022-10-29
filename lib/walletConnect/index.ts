import { Web3Provider } from '@ethersproject/providers'
import { IClientMeta } from '@walletconnect/types'
import WalletConnectProvider from '@walletconnect/web3-provider'
import assert from 'assert'
import { useCallback, useMemo, useState } from 'react'
import { useAsync, useAsyncRetry } from 'react-use'

import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'
import { checkAddress, checkAddressMayThrow } from '~lib/wallet'

const metadata: IClientMeta = {
  name: 'Archmage',
  description: 'The decentralized programmable Web3 wallet',
  url: 'https://archmage.live',
  icons: [
    'https://raw.githubusercontent.com/archmage-live/archmage-x/main/assets/archmage.svg'
  ]
}

export function useWalletConnect(
  network?: INetwork,
  onUrl?: (url: string) => void
) {
  const [chainId, setChainId] = useState<number | undefined>()
  const [accounts, setAccounts] = useState<string[] | undefined>()

  const {
    value: provider,
    loading,
    retry
  } = useAsyncRetry(async () => {
    setChainId(undefined)
    setAccounts(undefined)

    if (!network || !onUrl) {
      return
    }

    assert(network.kind === NetworkKind.EVM)

    const info = getNetworkInfo(network)
    if (!info.rpcUrl) {
      return
    }

    const provider = new WalletConnectProvider({
      clientMeta: metadata,
      bridge: 'https://bridge.walletconnect.org',
      rpc: { [network.chainId]: info.rpcUrl },
      chainId: +network.chainId,
      qrcode: false
    })

    provider.connector.on('display_uri', (err, payload) => {
      console.log(err, payload)
      const url = payload.params[0]
      onUrl(url)
    })

    provider.on('accountsChanged', (accounts: string[]) => {
      setAccounts(
        accounts.map((addr) => checkAddressMayThrow(network.kind, addr))
      )
    })

    provider.on('chainChanged', (chainId: number) => {
      setChainId(chainId)
    })

    provider.on('session_update', (error: any, payload: any) => {
      console.log(error, payload)
    })

    provider.on('disconnect', (error: any, payload: any) => {
      console.log(error, payload)
    })

    await provider.disconnect()
    provider
      .enable()
      .then((accounts) =>
        accounts.map((addr) => checkAddressMayThrow(network.kind, addr))
      )

    return provider
  }, [network, onUrl])

  const web3Provider = useMemo(
    () => provider && new Web3Provider(provider),
    [provider]
  )

  useAsync(async () => {
    if (!web3Provider) {
      return
    }
    const { chainId } = await web3Provider.getNetwork()
    const accounts = await web3Provider.listAccounts()
    setChainId(chainId)
    setAccounts(accounts)
  }, [web3Provider])

  const reconnect = useCallback(async () => {
    if (!loading) {
      retry()
    }
  }, [loading, retry])

  return {
    provider,
    web3Provider,
    reconnect,
    chainId,
    accounts
  }
}
