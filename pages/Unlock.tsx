import { Button, HStack, Input, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { AlertText } from '~components/AlertText'
import { usePassword } from '~lib/password'
import { WALLET_SERVICE, useSubWalletsCount } from '~lib/services/walletService'
import { createTab } from '~lib/util'

export default function Unlock() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { exists: passwordExists, isUnlocked } = usePassword()
  const walletCount = useSubWalletsCount()

  const [locked, setLocked] = useState(false)
  const [password, setPassword] = useState('')
  const [alert, setAlert] = useState('')

  useEffect(() => {
    setAlert('')
  }, [password])

  const redirect = useCallback(() => {
    if (passwordExists === false || walletCount === 0) {
      createTab('/tab/add-wallet')
      window.close()
    } else if (passwordExists && walletCount) {
      const to = searchParams.get('redirect') || '/consent'
      navigate(to, { replace: true })
    }
  }, [navigate, passwordExists, searchParams, walletCount])

  useEffect(() => {
    if (passwordExists === false) {
      redirect()
    }
  }, [passwordExists, redirect])

  useEffect(() => {
    if (isUnlocked) {
      redirect()
    } else if (isUnlocked === false) {
      setLocked(true)
    }
  }, [isUnlocked, redirect])

  const unlock = useCallback(
    (event: any) => {
      event.preventDefault()
      WALLET_SERVICE.unlock(password).then((ok) => {
        if (!ok) {
          setAlert('Wrong password')
        }
      })
    },
    [password]
  )

  return (
    <Stack p="4" pt="40" spacing="12">
      <Stack>
        <HStack justify="center">
          <Text fontSize="4xl" fontWeight="bold">
            Archmage X
          </Text>
        </HStack>
        {locked && (
          <HStack justify="center">
            <Text fontSize="lg" color="gray.500">
              Use your password to unlock
            </Text>
          </HStack>
        )}
      </Stack>

      {locked && (
        <form onSubmit={unlock}>
          <Stack spacing="12">
            <Input
              type="password"
              size="lg"
              placeholder="Password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <AlertText>{alert}</AlertText>

            <Button
              type="submit"
              h="14"
              size="lg"
              colorScheme="purple"
              borderRadius="8px"
              disabled={!password}>
              Unlock
            </Button>
          </Stack>
        </form>
      )}
    </Stack>
  )
}
