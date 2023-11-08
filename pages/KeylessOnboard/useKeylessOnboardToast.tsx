import { Button, HStack, useToast } from '@chakra-ui/react'
import { useAsync } from 'react-use'

import { INetwork, ISubWallet, IWallet } from '~lib/schema'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { createTab } from '~lib/tab'
import { isKeylessWallet } from '~lib/wallet'

export function useKeylessOnboardToast(
  wallet?: IWallet,
  subWallet?: ISubWallet,
  network?: INetwork
) {
  const toast = useToast()

  useAsync(async () => {
    const id = 'keyless-onboard-toast'

    if (!wallet || !subWallet || !network || !isKeylessWallet(wallet)) {
      toast.close(id)
      return
    }

    const account = await WALLET_SERVICE.getChainAccount({
      masterId: wallet.id,
      index: subWallet.index,
      networkKind: network.kind,
      chainId: network.chainId
    })

    if (account?.address) {
      toast.close(id)
      return
    }

    if (!toast.isActive(id)) {
      toast({
        id,
        position: 'bottom',
        duration: null,
        title: 'Keyless onboard',
        description: (
          <HStack justify="end" spacing={4}>
            <Button
              colorScheme="blue"
              onClick={async () => {
                await createTab(
                  `#/tab/keyless-onboard?wallet=${wallet.id}&subWallet=${subWallet.id}`
                )
              }}>
              Login
            </Button>
          </HStack>
        )
      })
    }
  }, [toast, wallet, subWallet, network])
}
