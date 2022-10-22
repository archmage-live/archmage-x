import { Stack } from '@chakra-ui/react'
import { Types } from 'aptos'

export enum AptosDataType {
  PAYLOAD,
  EVENTS,
  CHANGES
}

export const AptosTransactionData = ({
  tx,
  type
}: {
  tx: Types.Transaction_UserTransaction
  type: AptosDataType
}) => {
  switch (type) {
    case AptosDataType.PAYLOAD:
      return <AptosTransactionPayload tx={tx} />
    case AptosDataType.EVENTS:
      return <AptosTransactionEvents tx={tx} />
    case AptosDataType.CHANGES:
      return <AptosTransactionChanges tx={tx} />
  }
}

export const AptosTransactionPayload = ({
  tx
}: {
  tx: Types.Transaction_UserTransaction
}) => {
  return <Stack spacing={6}></Stack>
}

export const AptosTransactionEvents = ({
  tx
}: {
  tx: Types.Transaction_UserTransaction
}) => {
  return <Stack spacing={6}></Stack>
}

export const AptosTransactionChanges = ({
  tx
}: {
  tx: Types.Transaction_UserTransaction
}) => {
  return (
    <Stack spacing={6}>
      {tx.changes.map((change) => {
        return <></>
      })}
    </Stack>
  )
}
