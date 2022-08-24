import { NetworkKind } from '~lib/network'
import { ChainId } from '~lib/schema/network'

export interface IAddressBook {
  id: number
  sortId: number
  name?: string
  networkKind: NetworkKind
  chainId: ChainId
  address: string
}

export const addressBookSchemaV1 =
  '++id, sortId, name, &[networkKind+chainId+address], address'
