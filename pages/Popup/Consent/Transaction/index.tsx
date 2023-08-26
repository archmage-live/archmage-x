import { ReactNode } from 'react'

import { NetworkKind } from '~lib/network'
import { ConsentRequest } from '~lib/services/consentService'
import { getNetworkInfo, useNetwork } from '~lib/services/network'
import { useBalance } from '~lib/services/provider'
import {
  useChainAccount,
  useSubWalletByIndex,
  useWallet
} from '~lib/services/wallet'

import { AptosTransaction } from './AptosTransaction'
import { CosmTransaction } from './CosmTransactioin'
import { EvmTransaction } from './EvmTransaction'
import { StarknetTransaction } from './starknet/StarknetTransaction'

export const Transaction = ({
  request,
  onComplete,
  rejectAllButton
}: {
  request: ConsentRequest
  onComplete: () => void
  rejectAllButton: ReactNode
}) => {
  const network = useNetwork(request.networkId)
  const networkInfo = network && getNetworkInfo(network)
  const account = useChainAccount(request.accountId as number)
  const wallet = useWallet(account?.masterId)
  const subWallet = useSubWalletByIndex(account?.masterId, account?.index)
  const balance = useBalance(network, account)

  if (
    !request ||
    !network ||
    !networkInfo ||
    !account ||
    !wallet ||
    !subWallet
  ) {
    return <></>
  }

  switch (network.kind) {
    case NetworkKind.EVM:
      return (
        <EvmTransaction
          origin={request.origin}
          request={request}
          network={network}
          networkInfo={networkInfo}
          wallet={wallet}
          subWallet={subWallet}
          account={account}
          balance={balance}
          onComplete={onComplete}
          suffix={rejectAllButton}
        />
      )
    case NetworkKind.STARKNET:
      return (
        <StarknetTransaction
          origin={request.origin}
          request={request}
          network={network}
          networkInfo={networkInfo}
          wallet={wallet}
          subWallet={subWallet}
          account={account}
          balance={balance}
          onComplete={onComplete}
          suffix={rejectAllButton}
        />
      )
    case NetworkKind.COSM:
      return (
        <CosmTransaction
          origin={request.origin}
          request={request}
          network={network}
          networkInfo={networkInfo}
          wallet={wallet}
          subWallet={subWallet}
          account={account}
          balance={balance}
          onComplete={onComplete}
          suffix={rejectAllButton}
        />
      )
    case NetworkKind.APTOS:
      return (
        <AptosTransaction
          origin={request.origin}
          request={request}
          network={network}
          networkInfo={networkInfo}
          wallet={wallet}
          subWallet={subWallet}
          account={account}
          balance={balance}
          onComplete={onComplete}
          suffix={rejectAllButton}
        />
      )
  }

  return <></>
}
