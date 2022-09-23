import { NetworkKind } from '~lib/network'
import { ConsentRequest } from '~lib/services/consentService'
import { getNetworkInfo, useNetwork } from '~lib/services/network'
import { useBalance } from '~lib/services/provider'
import {
  useChainAccount,
  useSubWalletByIndex,
  useWallet
} from '~lib/services/walletService'

import { EvmTransaction } from './EvmTransaction'

export const Transaction = ({ request }: { request: ConsentRequest }) => {
  const network = useNetwork(request.networkId)
  const networkInfo = network && getNetworkInfo(network)
  const account = useChainAccount(request.accountId as number)
  const wallet = useWallet(account?.masterId)
  const subWallet = useSubWalletByIndex(account?.masterId, account?.index)
  const balance = useBalance(network, account)

  if (!network || !networkInfo || !account || !wallet || !subWallet) {
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
        />
      )
  }

  return <></>
}
