import {
  Box,
  Button,
  ButtonGroup,
  Divider,
  HStack,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { useState } from 'react'
import * as React from 'react'
import { useAsyncRetry } from 'react-use'

import { AlertBox } from '~components/AlertBox'
import { Web3AuthLogo } from '~components/Web3AuthLogo'
import { Web3authModal } from '~lib/keyless/web3authModal'
import { KeylessWalletInfo, KeylessWalletType } from '~lib/wallet'

import { OnboardKeylessHd } from './OnboardKeylessHd'
import { OnboardKeylessPrivateKey } from './OnboardKeylessPrivateKey'

const importKinds = ['Private Key', 'HD'] as const

export const StepOnboardKeyless = () => {
  const [kind, setKind] = useState<typeof importKinds[number]>(importKinds[0])

  const theme = useColorModeValue('light', 'dark')

  const [info, setInfo] = useState<KeylessWalletInfo | undefined>(undefined)
  const [mnemonic, setMnemonic] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [hash, setHash] = useState('')

  const [alert, setAlert] = useState('')

  const {
    value: web3auth,
    retry,
    loading
  } = useAsyncRetry(async () => {
    setAlert('')

    const web3auth = await Web3authModal.connect({
      theme,
      reconnect: true
    })
    try {
      if (web3auth) {
        const info = await web3auth.getInfo()
        const privateKey = await web3auth.getPrivateKey()
        const mnemonic = await web3auth.getMnemonic()
        const hash = await web3auth.getUniqueHash()
        if (info && privateKey && mnemonic && hash) {
          setInfo({
            type: KeylessWalletType.WEB3AUTH,
            ...info
          })
          setPrivateKey(privateKey)
          setMnemonic(mnemonic)
          setHash(hash)
          return web3auth
        }
      }
    } catch (err) {
      console.error(err)
    }

    setInfo(undefined)
    setPrivateKey('')
    setMnemonic('')

    setAlert('Press "Login" button to access web3auth wallet.')

    return undefined
  }, [theme])

  return (
    <Stack p="4" pt="16" spacing="6">
      <Stack>
        <HStack spacing={4} justify="center">
          <Text fontSize="4xl" fontWeight="bold">
            Onboard with
          </Text>
          <Web3AuthLogo w={48} />
        </HStack>
        <Text fontSize="lg" color="gray.500" textAlign="center">
          {kind === 'Private Key'
            ? 'Onboard web3auth for a private-key wallet.'
            : 'Onboard web3auth for a HD wallet.'}
        </Text>
      </Stack>

      <HStack justify="space-between">
        <Box w="96px"></Box>

        <ButtonGroup size="md" colorScheme="purple" isAttached>
          <Button
            minW="96px"
            variant={kind === 'Private Key' ? 'solid' : 'outline'}
            onClick={() => setKind('Private Key')}>
            Private Key
          </Button>
          <Button
            minW="96px"
            variant={kind === 'HD' ? 'solid' : 'outline'}
            onClick={() => setKind('HD')}>
            HD
          </Button>
        </ButtonGroup>

        <Button size="md" variant="outline" isLoading={loading} onClick={retry}>
          {!web3auth ? 'Login' : 'Re-login'}
        </Button>
      </HStack>

      <AlertBox>{alert}</AlertBox>

      {info && privateKey && mnemonic && hash && (
        <>
          <Divider />

          {kind === 'Private Key' ? (
            <OnboardKeylessPrivateKey
              info={info}
              privateKey={privateKey}
              hash={hash}
            />
          ) : (
            <OnboardKeylessHd info={info} mnemonic={mnemonic} hash={hash} />
          )}
        </>
      )}
    </Stack>
  )
}
