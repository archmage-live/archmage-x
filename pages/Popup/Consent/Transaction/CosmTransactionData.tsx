import { Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { AminoMsg } from '@cosmjs/amino'
import { ABCIMessageLog } from 'cosmjs-types/cosmos/base/abci/v1beta1/abci'
import { Any } from 'cosmjs-types/google/protobuf/any'
import React from 'react'

import { CosmMsg } from '~lib/services/transaction/cosmParse'

export const CosmTransactionMessages = ({
  msgs
}: {
  msgs?: CosmMsg[] | Any[] | AminoMsg[]
}) => {
  const rjvTheme = useColorModeValue('rjv-default', 'brewer')
  const rjvBg = useColorModeValue('gray.50', 'rgb(12, 13, 14)')

  return (
    <Stack spacing={6}>
      <Stack spacing={2}>
        {msgs?.map((msg, index) => {
          return <></>
        })}
      </Stack>
    </Stack>
  )
}

export const CosmTransactionEvents = ({
  events
}: {
  events?: ABCIMessageLog[]
}) => {
  return <></>
}
