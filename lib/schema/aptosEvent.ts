import { NetworkKind } from '~lib/network'

import { ChainId } from './network'
import { Index } from './subWallet'

export interface IAptosEvent {
  id: number
  masterId: number // master wallet id
  index: Index // derived wallet index
  networkKind: NetworkKind
  chainId: ChainId
  address: string
  creationNumber: number
  sequenceNumber: number
  info: any
}

export const aptosEventSchemaV2 =
  '++id, &[masterId+index+networkKind+chainId+address+creationNumber+sequenceNumber], [networkKind+chainId]'
