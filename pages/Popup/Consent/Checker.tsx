import { Button, HStack, Stack, Text } from '@chakra-ui/react'
import { useAsyncRetry, useInterval } from 'react-use'

import { AlertBox } from '~components/AlertBox'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { useProvider } from '~lib/services/provider'
import { createTab } from '~lib/tab'
import { isKeylessWallet } from '~lib/wallet'

export function useSignableChecker(
  network?: INetwork,
  account?: IChainAccount
) {
  const provider = useProvider(network)

  const {
    value: signable,
    retry,
    loading
  } = useAsyncRetry(async () => {
    if (!provider || !account) {
      return
    }
    return await provider.isSignable(account)
  }, [provider, account])

  useInterval(retry, !loading ? 2000 : null)

  return signable
}

export const SignableChecker = ({
  wallet,
  subWallet,
  signable
}: {
  wallet?: IWallet
  subWallet?: ISubWallet
  signable?: boolean
}) => {
  if (signable !== false || !wallet || !subWallet) {
    return <></>
  }

  if (isKeylessWallet(wallet.type)) {
    return (
      <AlertBox level="warning" nowrap>
        <Stack>
          <Text>
            Prior to clicking confirm, you should sign in with your keyless
            account.
          </Text>

          <HStack justify="end">
            <Button
              size="sm"
              colorScheme="purple"
              onClick={async () => {
                await createTab(
                  `#/tab/keyless-onboard?wallet=${wallet.id}&subWallet=${subWallet.id}`
                )
              }}>
              Login
            </Button>
          </HStack>
        </Stack>
      </AlertBox>
    )
  }

  return <></>
}
