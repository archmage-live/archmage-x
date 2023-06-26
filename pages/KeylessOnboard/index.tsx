import { Button, Container, HStack, Stack, Text } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAsyncRetry } from 'react-use'

import { AlertBox } from '~components/AlertBox'
import { Card } from '~components/Card'
import { TitleBar } from '~components/TitleBar'
import { Web3AuthLogo } from '~components/Web3AuthLogo'
import { Web3auth } from '~lib/keyless/web3auth'
import { useCheckUnlocked } from '~lib/password'
import { useSubWallet, useWallet } from '~lib/services/wallet'
import { WalletType, extractWalletHash } from '~lib/wallet'
import { KeylessOnboardInfo } from '~pages/KeylessOnboard/KeylessOnboardInfo'

export * from './KeylessOnboardInfo'

export default function KeylessOnboard() {
  useCheckUnlocked()

  const [searchParams] = useSearchParams()
  const id = Number(searchParams.get('wallet'))
  const subId = Number(searchParams.get('subWallet'))

  const wallet = useWallet(Number.isInteger(id) ? id : undefined)
  const subWallet = useSubWallet(Number.isInteger(subId) ? subId : undefined)

  const [info, storedHash] = useMemo(() => {
    if (!wallet || !subWallet) {
      return []
    }
    switch (wallet.type) {
      case WalletType.KEYLESS_HD:
      // pass through
      case WalletType.KEYLESS:
        return [wallet.info.keyless!, wallet.hash]
      case WalletType.KEYLESS_GROUP:
        return [subWallet.info.keyless!, subWallet.hash!]
      default:
        return []
    }
  }, [wallet, subWallet])

  const [done, setDone] = useState(false)
  const [alert, setAlert] = useState('')

  const { retry, loading } = useAsyncRetry(async () => {
    setAlert('')

    if (!info || !storedHash) {
      return
    }

    const web3auth = await Web3auth.connect({
      loginProvider: info.loginProvider as any,
      reconnect: true
    })

    try {
      if (web3auth) {
        const hash = await web3auth.getUniqueHash()
        if (hash === extractWalletHash(storedHash)) {
          await web3auth.cacheKeystore()

          setDone(true)
        } else {
          setAlert(
            'Wrong user identity! Please login with the counterpart credentials.'
          )
        }
      } else {
        setAlert('Press "Login" button to access web3auth wallet.')
      }
    } catch (err) {
      console.error(err)
      setAlert('Something went wrong.')
    }
  }, [info, storedHash])

  return (
    <>
      <TitleBar />

      <Container centerContent mt="16" mb="32">
        <Card w="36rem">
          <Stack p="4" pt="16" spacing="6">
            <HStack spacing={4} justify="center">
              <Text fontSize="4xl" fontWeight="bold">
                Onboard with
              </Text>
              <Web3AuthLogo w={48} />
            </HStack>

            {info && <KeylessOnboardInfo info={info} />}

            <Button
              size="lg"
              variant="outline"
              isDisabled={!info || !storedHash}
              isLoading={loading}
              onClick={() => {
                !done ? retry() : window.close()
              }}>
              {!done ? 'Login' : 'Done'}
            </Button>

            <AlertBox>{alert}</AlertBox>
          </Stack>
        </Card>
      </Container>
    </>
  )
}
