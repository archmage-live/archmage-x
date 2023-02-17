import { StdSignDoc } from '@cosmjs/amino'
import { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { ReactNode } from 'react'

import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { ConsentRequest } from '~lib/services/consentService'
import { NetworkInfo } from '~lib/services/network'
import { formatTxPayload } from '~lib/services/provider'
import { Balance } from '~lib/services/token'

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
  const {} = payload as {
    txParams: SignDoc | StdSignDoc
  }

  return <></>
}
