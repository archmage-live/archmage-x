import { Button, Center, Input, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { AlertBox } from '~components/AlertBox'
import { usePassword } from '~lib/password'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { useSubWalletsCount } from '~lib/services/walletService'
import { createTab } from '~lib/util'
import { Overlay } from '~pages/Popup/Overlay'

let open = false

function openWelcomeTab() {
  if (open) return
  open = true
  createTab('/tab/welcome')
  window.close()
}

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
      openWelcomeTab()
    } else if (passwordExists && walletCount) {
      const to = searchParams.get('redirect')
      navigate(to || '/', { replace: true })
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
      PASSWORD_SERVICE.unlock(password).then((ok) => {
        if (!ok) {
          setAlert('Wrong password')
        }
      })
    },
    [password]
  )

  return (
    <Overlay
      subtitle={
        locked && (
          <Stack align="center" spacing={0}>
            <Text fontSize="2xl" fontWeight="bold">
              Archmage X
            </Text>
            <Text fontSize="lg" color="gray.500">
              Use your password to unlock
            </Text>
          </Stack>
        )
      }>
      {locked && (
        <form onSubmit={unlock}>
          <Center w="full">
            <Stack spacing="6" px={4} w="full" maxW="360px">
              <Input
                type="password"
                size="lg"
                placeholder="Password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              <AlertBox>{alert}</AlertBox>

              <Button
                type="submit"
                h="14"
                size="lg"
                colorScheme="purple"
                borderRadius="8px"
                isDisabled={!password}>
                Unlock
              </Button>
            </Stack>
          </Center>
        </form>
      )}
    </Overlay>
  )
}
