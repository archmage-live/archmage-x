import { ReactNode } from 'react'

import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { ConsentRequest } from '~lib/services/consentService'
import { NetworkInfo } from '~lib/services/network'
import { Balance } from '~lib/services/token'
import { formatTxPayload } from "~lib/services/provider";

export const CosmTransaction = ({
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
  const payload = formatTxPayload(network, request.payload)
  const {
  } = payload as {
    txParams:,
  }

  return <></>
}
