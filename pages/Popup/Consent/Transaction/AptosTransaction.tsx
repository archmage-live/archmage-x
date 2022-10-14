import { ReactNode } from 'react'

import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { ConsentRequest } from '~lib/services/consentService'
import { NetworkInfo } from '~lib/services/network'
import { Balance } from '~lib/services/token'

export const AptosTransaction = ({
  origin,
  request,
  network,
  networkInfo,
  wallet,
  subWallet,
  account,
  balance,
  suffix,
  onComplete
}: {
  origin?: string
  request: ConsentRequest
  network: INetwork
  networkInfo: NetworkInfo
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
  balance?: Balance
  suffix?: ReactNode
  onComplete: () => void
}) => {
  return <></>
}
