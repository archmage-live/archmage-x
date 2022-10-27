import { Box, Button, Checkbox, HStack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { AccountAvatar } from '~components/AccountAvatar'
import { Badge } from '~components/Badge'
import { WalletId } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { INetwork } from '~lib/schema/network'
import { useBalance } from '~lib/services/provider'
import { shortenAddress } from '~lib/utils'
import { getWalletTypeIdentifier, isWalletGroup } from '~lib/wallet'
import { WalletEntry } from '~pages/Popup/WalletDrawer/tree'

import { SubWalletList } from './SubWalletList'

interface WalletItemProps {
  network?: INetwork
  walletEntry: WalletEntry
  onToggleOpen: (id: number) => void
  onChecked: (selected: WalletId | number, isChecked: boolean) => void
  measureElement?: (element?: HTMLElement | null) => any
}

export const WalletItem = ({
  network,
  walletEntry,
  onToggleOpen,
  onChecked,
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

  const balance = useBalance(network, account)

  const [isChecked, setIsChecked] = useState<boolean>()
  const [isIndeterminate, setIsIndeterminate] = useState<boolean>()

  useEffect(() => {
    if (!isWalletGroup(wallet.type)) {
      setIsChecked(subWallet?.isChecked)
      return
    }

    const all = subWallets?.every((subWallet) => subWallet.isChecked)
    const none = subWallets?.every((subWallet) => !subWallet.isChecked)

    setIsChecked(all)
    setIsIndeterminate(!none && !all)
  }, [onChecked, wallet, subWallets, subWallet])

  const typeIdentifier = getWalletTypeIdentifier(wallet)

  return (
    <Box ref={elRef}>
      <Button
        key={wallet.id}
        variant="ghost"
        size="lg"
        w="full"
        h={16}
        px={4}
        justifyContent="start"
        onClick={() => {
          if (isWalletGroup(wallet.type)) {
            onToggleOpen(wallet.id)
          } else {
            onChecked(wallet.id, !isChecked)
          }
        }}>
        <Box w="full">
          <HStack w="full" justify="space-between">
            <Box mb="-12px" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                isIndeterminate={isIndeterminate}
                isChecked={isChecked}
                onChange={(e) => {
                  onChecked(wallet.id, e.target.checked)
                }}
              />
            </Box>

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
                    {shortenAddress(account.address)}
                  </Text>
                )}

                {isWalletGroup(wallet.type) && (
                  <Text fontSize="sm" color="gray.500">
                    {subWallets.length} accounts
                  </Text>
                )}
              </HStack>
            </HStack>
          </HStack>

          <HStack
            w="calc(100% - 29.75px)"
            ps={'62px'}
            pt="10px"
            h="14px"
            justify="space-between">
            <HStack>
              {balance && (
                <Text fontSize="xs" color="gray.500" textAlign="start">
                  {formatNumber(balance.amount)} {balance.symbol}
                </Text>
              )}
              {typeIdentifier && (
                <Text textAlign="start">
                  <Badge>{typeIdentifier}</Badge>
                </Text>
              )}
            </HStack>
          </HStack>
        </Box>
      </Button>

      {isOpen && network && isWalletGroup(wallet.type) && (
        <SubWalletList
          network={network}
          subWallets={subWallets}
          onChecked={onChecked}
          measure={measure}
        />
      )}
    </Box>
  )
}
