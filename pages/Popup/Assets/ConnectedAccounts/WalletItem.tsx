import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'

import { AccountAvatar } from '~components/AccountAvatar'
import { useTransparentize } from '~lib/hooks/useColor'
import { INetwork } from '~lib/schema/network'
import { shortenString } from '~lib/utils'
import { isWalletGroup } from '~lib/wallet'

import { Entry } from '.'
import { ConnIndicator, ConnMenu } from './SubWalletItem'
import { SubWalletList } from './SubWalletList'

interface WalletItemProps {
  network?: INetwork
  walletEntry: Entry
  onToggleOpen: (id: number) => void
  measureElement?: (element?: HTMLElement | null) => any
}

export const WalletItem = ({
  network,
  walletEntry,
  onToggleOpen,
  measureElement
}: WalletItemProps) => {
  const { wallet, isOpen, subWallets } = walletEntry

  const elRef = useRef(null)

  const measure = useCallback(() => {
    measureElement?.(elRef.current)
  }, [measureElement])

  useEffect(() => {
    measure()
  }, [isOpen, measure])

  const subWallet = !isWalletGroup(wallet.type) ? subWallets[0] : undefined
  const account = subWallet?.account

  const bg = useTransparentize('purple.300', 'purple.300', 0.1)

  return (
    <Box ref={elRef} py={1}>
      <Box
        borderWidth="1px"
        borderRadius="md"
        borderColor={!subWallets[0].isConnected ? 'purple.500' : undefined}
        bg={!subWallets[0].isConnected ? bg : undefined}>
        <Button
          key={wallet.id}
          as="div"
          cursor={!subWallet ? 'pointer' : undefined}
          variant="ghost"
          size="lg"
          w="full"
          h={16}
          px={4}
          justifyContent="start"
          onClick={() => {
            if (isWalletGroup(wallet.type)) {
              onToggleOpen(wallet.id)
            }
          }}>
          <Box w="full">
            <HStack w="full" justify="space-between">
              <HStack w="calc(100% - 29.75px)" justify="space-between">
                <AccountAvatar
                  text={account ? account.address : wallet.hash}
                  scale={0.8}
                  m="-3px"
                  mb="-16px"
                />

                <HStack w="calc(100% - 31px)" justify="space-between">
                  <Text fontSize="lg" noOfLines={1} display="block">
                    {wallet.name}
                  </Text>

                  {account && (
                    <Text
                      sx={{ fontFeatureSettings: '"tnum"' }}
                      fontSize="sm"
                      color="gray.500">
                      {shortenString(account.address)}
                    </Text>
                  )}

                  {isWalletGroup(wallet.type) && (
                    <Text fontSize="sm" color="gray.500">
                      {subWallets.length} accounts
                    </Text>
                  )}
                </HStack>
              </HStack>

              {subWallet?.isConnected && <ConnMenu subWallet={subWallet} />}
            </HStack>

            <HStack w="calc(100% - 29.75px)" ps="32px" pt="10px" h="14px">
              {subWallet ? (
                <ConnIndicator subWallet={subWallet} />
              ) : (
                <ConnIndicator
                  subWallet={{
                    isConnected: subWallets.every((w) => w.isConnected),
                    isActive: subWallets.some((w) => w.isActive)
                  }}></ConnIndicator>
              )}
            </HStack>
          </Box>
        </Button>

        {isOpen && network && isWalletGroup(wallet.type) && (
          <SubWalletList
            network={network}
            subWallets={subWallets}
            measure={measure}
          />
        )}
      </Box>
    </Box>
  )
}
