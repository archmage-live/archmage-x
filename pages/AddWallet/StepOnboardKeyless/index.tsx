import {
  Divider,
  HStack,
  Image,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import web3authLogoDark from 'data-base64:~assets/thirdparty/web3auth-logo-Dark.svg'
import web3authLogoLight from 'data-base64:~assets/thirdparty/web3auth-logo.svg'
import { useState } from 'react'
import { useAsync } from 'react-use'

import { SwitchBar } from '~components/SwitchBar'
import { Web3Auth } from '~lib/keyless/web3auth'

import { OnboardKeylessHd } from './OnboardKeylessHd'
import { OnboardKeylessPrivateKey } from './OnboardKeylessPrivateKey'

const importKinds = ['Mnemonic', 'Private Key'] as const

export const StepOnboardKeyless = () => {
  const [kind, setKind] = useState<typeof importKinds[number]>(importKinds[0])

  const web3authLogo = useColorModeValue(web3authLogoLight, web3authLogoDark)

  const theme = useColorModeValue('light', 'dark')

  useAsync(async () => {
    const web3auth = await Web3Auth.connect({
      theme,
      reconnect: true
    })
    try {
      if (web3auth) {
        console.log(await web3auth.getUserInfo())
        console.log(await web3auth.getPrivateKey())
        console.log(await web3auth.getMnemonic())
      }
    } catch (err) {
      console.error(err)
    }
  }, [theme])

  return (
    <Stack p="4" pt="16" spacing="6">
      <Stack>
        <HStack spacing={4} justify="center">
          <Text fontSize="4xl" fontWeight="bold">
            Onboard with
          </Text>
          <Image w={48} fit="cover" src={web3authLogo} alt="web3auth Logo" />
        </HStack>
        <Text fontSize="lg" color="gray.500" textAlign="center">
          {kind === 'Mnemonic'
            ? 'Onboard web3auth for a HD wallet.'
            : 'Onboard web3auth for a private-key wallet.'}
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
        <OnboardKeylessHd />
      ) : (
        <OnboardKeylessPrivateKey />
      )}
    </Stack>
  )
}
