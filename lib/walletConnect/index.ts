import { Web3Provider } from '@ethersproject/providers'
import { IClientMeta } from '@walletconnect/types'
import WalletConnectProvider from '@walletconnect/web3-provider'
import assert from 'assert'
import { useCallback, useMemo, useState } from 'react'
import { useAsyncRetry } from 'react-use'

import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'
import { stall } from '~lib/utils'
import { checkAddressMayThrow } from '~lib/wallet'

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
  const [waitConnected, setWaitConnected] = useState<Promise<void>>()

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

    let resolve: Function, reject: Function
    const promise = new Promise<void>((res, rej) => {
      resolve = res
      reject = rej
    })
    setWaitConnected(promise)

    provider
      .enable()
      .then((accounts) => {
        setAccounts(
          accounts.map((addr) => checkAddressMayThrow(network!.kind, addr))
        )
        resolve()
      })
      .catch((err) => {
        reject(err)
      })

    return provider
  }, [network, onUrl])

  const web3Provider = useMemo(
    () => provider && new Web3Provider(provider),
    [provider]
  )

  const refresh = useCallback(async () => {
    if (!loading) {
      if (provider?.connected) {
        await provider.disconnect()
        while (true) {
          await stall(100)
          if (!provider.connected) {
            break
          }
        }
      }
      retry()
    }
  }, [loading, retry, provider])

  return {
    provider,
    web3Provider,
    waitConnected,
    refresh,
    chainId,
    addresses: accounts
  }
}
