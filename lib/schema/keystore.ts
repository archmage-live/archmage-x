import { Index } from './subWallet'

export interface IKeystore {
  id: number
  masterId: number // master wallet id
  index: Index // derived wallet index
  keystore: string // encrypted keystore
}

export const keystoreSchemaV1 = '++id, &[masterId+index]'
