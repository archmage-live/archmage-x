import {
  Button,
  ButtonGroup,
  Divider,
  HStack,
  Stack,
  Text
} from '@chakra-ui/react'
import * as React from 'react'
import { useState } from 'react'

import { SafeLogo } from '~components/SafeLogo'

import { CreateSafe } from './CreateSafe'
import { ImportSafe } from './ImportSafe'

export const StepMultisigSafe = () => {
  const kinds = ['Create', 'Import'] as const
  const [kind, setKind] = useState<typeof kinds[number]>(kinds[0])

  return (
    <Stack p="4" pt="16" spacing="6">
      <Stack>
        <HStack spacing={4} justify="center">
          <Text fontSize="4xl" fontWeight="bold">
            {kind === 'Create' ? 'Create' : 'Import'}
          </Text>
          <SafeLogo w={48} />
          <Text fontSize="4xl" fontWeight="bold">
            Account
          </Text>
        </HStack>
        <Text fontSize="lg" color="gray.500" textAlign="center">
          {kind === 'Create'
            ? 'A new Account that is controlled by one or multiple owners.'
            : 'Already have a Safe Account? Add it via its address.'}
        </Text>
      </Stack>

      <HStack justify="center">
        <ButtonGroup size="md" colorScheme="purple" isAttached>
          <Button
            minW="96px"
            variant={kind === 'Create' ? 'solid' : 'outline'}
            onClick={() => setKind('Create')}>
            ➕ Create
          </Button>
          <Button
            minW="96px"
            variant={kind === 'Import' ? 'solid' : 'outline'}
            onClick={() => setKind('Import')}>
            ↘️ Import
          </Button>
        </ButtonGroup>
      </HStack>

      <Divider />

      {kind === 'Create' ? <CreateSafe /> : <ImportSafe />}
    </Stack>
  )
}
