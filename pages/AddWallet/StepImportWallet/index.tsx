import { Divider, HStack, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'

import { SwitchBar } from '~/components/SwitchBar'

import { ImportMnemonic } from './ImportMnemonic'
import { ImportPrivateKey } from './ImportPrivateKey'
import { ImportWatchAddress } from './ImportWatchAddress'

const importKinds = ['Mnemonic', 'Private Key', 'Watch Address'] as const

export const StepImportWallet = () => {
  const [kind, setKind] = useState<typeof importKinds[number]>(importKinds[0])

  return (
    <Stack p="4" pt="16" spacing="6">
      <Stack>
        <Text fontSize="4xl" fontWeight="bold" textAlign="center">
          Import Wallet
        </Text>
        <Text fontSize="lg" color="gray.500" textAlign="center">
          {kind === 'Mnemonic'
            ? 'Import an existing wallet with your secret recovery phrase.'
            : kind === 'Private Key'
            ? 'Import an existing wallet with your private key.'
            : 'Import some existing address(es) for watching.'}
        </Text>

        <HStack justify="center" pt="4">
          <SwitchBar
            targets={importKinds}
            value={kind}
            onChange={setKind as any}
          />
        </HStack>
      </Stack>

      <Divider />

      {kind === 'Mnemonic' ? (
        <ImportMnemonic />
      ) : kind === 'Private Key' ? (
        <ImportPrivateKey />
      ) : (
        <ImportWatchAddress />
      )}
    </Stack>
  )
}
