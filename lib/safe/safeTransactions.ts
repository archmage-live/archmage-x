import {
  AddOwnerTxParams,
  RemoveOwnerTxParams,
  SwapOwnerTxParams
} from '@safe-global/protocol-kit'
import {
  MetaTransactionData,
  SafeTransactionDataPartial
} from '@safe-global/safe-core-sdk-types'

export enum SafeTxType {
  EnableFallbackHandler,
  DisableFallbackHandler,
  EnableGuard,
  DisableGuard,
  EnableModule,
  DisableModule,
  AddOwner,
  RemoveOwner,
  SwapOwner,
  ChangeThreshold,
  SendToken,
  SendNft,
  SingleSend,
  MultiSend,
  Rejection
}

export type SafeTxParams =
  | {
      type: SafeTxType.EnableFallbackHandler
      fallbackHandlerAddress: string
    }
  | {
      type: SafeTxType.DisableFallbackHandler
    }
  | {
      type: SafeTxType.EnableGuard
      guardAddress: string
    }
  | {
      type: SafeTxType.DisableGuard
    }
  | {
      type: SafeTxType.EnableModule | SafeTxType.DisableModule
      moduleAddress: string
    }
  | {
      type: SafeTxType.AddOwner
      params: AddOwnerTxParams
    }
  | {
      type: SafeTxType.RemoveOwner
      params: RemoveOwnerTxParams
    }
  | {
      type: SafeTxType.SwapOwner
      params: SwapOwnerTxParams
    }
  | {
      type: SafeTxType.ChangeThreshold
      threshold: number
    }
  | {
      type: SafeTxType.SendToken
      params: {
        to: string
        contract?: string // empty for native token
        amount: string
      }
    }
  | {
      // actually may be multiSend yet
      type: SafeTxType.SendNft
      to: string
      params: {
        contract: string
        tokenId: string
        amount?: string // for ERC1155
        tx: MetaTransactionData
      }[]
    }
  | {
      type: SafeTxType.SingleSend
      params: SafeTransactionDataPartial
      onlyCalls?: boolean
    }
  | {
      type: SafeTxType.MultiSend
      params: MetaTransactionData[]
      onlyCalls?: boolean
    }
  | {
      type: SafeTxType.Rejection
      nonce: number
    }
