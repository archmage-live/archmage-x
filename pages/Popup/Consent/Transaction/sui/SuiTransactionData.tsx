import { Box, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { DryRunTransactionBlockResponse } from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import * as React from 'react'
import ReactJson from 'react-json-view'

import { JsonDisplay } from '~components/JsonDisplay'

export const SuiTransactionData = ({ data }: { data: TransactionBlock }) => {
  const rjvTheme = useColorModeValue('rjv-default', 'brewer')
  const rjvBg = useColorModeValue('gray.50', 'rgb(12, 13, 14)')

  return (
    <Stack spacing={6}>
      <Stack>
        <Text>Inputs:</Text>
        <JsonDisplay data={data.blockData.inputs} />
      </Stack>

      <Stack>
        <Text>Transactions:</Text>
        <JsonDisplay data={data.blockData.transactions} />
      </Stack>
    </Stack>
  )
}

export const SuiTransactionDryRun = ({
  dryRun
}: {
  dryRun?: DryRunTransactionBlockResponse | false
}) => {
  if (!dryRun) {
    return (
      <Text textAlign="center" color="gray.500">
        {dryRun === false ? 'No data since simulation failed' : 'No data'}
      </Text>
    )
  }

  return (
    <Stack spacing={6}>
      <Stack>
        <Text>Balance changes:</Text>
        <JsonDisplay data={dryRun.balanceChanges} />
      </Stack>

      <Stack>
        <Text>Object changes:</Text>
        <JsonDisplay data={dryRun.objectChanges} />
      </Stack>

      <Stack>
        <Text>Effects:</Text>
        <JsonDisplay data={dryRun.effects} />
      </Stack>

      <Stack>
        <Text>Events:</Text>
        <JsonDisplay data={dryRun.events} />
      </Stack>

      <Stack>
        <Text>Transaction block:</Text>
        <JsonDisplay data={dryRun.input} />
      </Stack>
    </Stack>
  )
}
