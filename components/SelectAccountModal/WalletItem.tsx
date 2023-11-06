import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon
} from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Portal,
  Text
} from '@chakra-ui/react'
import { MdQrCode } from '@react-icons/all-files/md/MdQrCode'
import { useCallback, useEffect, useRef } from 'react'
import browser from 'webextension-polyfill'

import { AccountAvatar } from '~components/AccountAvatar'
import { useAccountDetailModal } from '~components/AccountDetailModal'
import { TypeBadge } from '~components/TypeBadge'
import { WalletId } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { INetwork } from '~lib/schema/network'
import { getAccountUrl } from '~lib/services/network'
import { Amount } from '~lib/services/token'
import { WalletEntry } from '~lib/services/wallet/tree'
import { shortenString } from '~lib/utils'
import { getWalletTypeIdentifier, isWalletGroup } from '~lib/wallet'

import { MenuBtn } from './SubWalletItem'
import { SubWalletList } from './SubWalletList'

interface WalletItemProps {
  network?: INetwork
  walletEntry: WalletEntry
  balance?: Amount
  isOpen: boolean
  onToggleOpen: (id: number) => void
  onSelected: (selected: WalletId) => void
  onClose: () => void
  measureElement?: (element: HTMLElement | null) => any
  index: number
  setSubScrollOffset: (walletId: number, offset: number) => void
}

export const WalletItem = ({
  network,
  walletEntry,
  balance,
  isOpen,
  onToggleOpen,
  onSelected,
  onClose,
  measureElement,
  index,
  setSubScrollOffset
}: WalletItemProps) => {
  const { wallet, subWallets } = walletEntry

  const elRef = useRef(null)

  const measure = useCallback(() => {
    measureElement?.(elRef.current)
  }, [measureElement])

  useEffect(() => {
    measure()
  }, [isOpen, measure])

  // only for single wallet
  const subWallet = !isWalletGroup(wallet.type) ? subWallets[0] : undefined
  const account = subWallet?.account

  const { onOpen: onDetailOpen } = useAccountDetailModal()

  const accountUrl = network && account && getAccountUrl(network, account)

  const typeIdentifier = getWalletTypeIdentifier(wallet)

  return (
    <Box ref={elRef} data-index={index}>
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
            if (account) {
              onSelected({
                id: wallet.id,
                subId: subWallet?.subWallet.id
              })
            }
            onClose()
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

            {subWallets.some((entry) => entry.isSelected) && (
              <CheckIcon fontSize="lg" color="green.500" />
            )}
          </HStack>

          <HStack
            w="full"
            ps={'32px'}
            pt="10px"
            h="14px"
            justify="space-between">
            <HStack w="calc(100% - 29.75px)" justify="space-between">
              <HStack>
                {balance && (
                  <Text fontSize="xs" color="gray.500" textAlign="start">
                    {formatNumber(balance.amount)} {balance.symbol}
                  </Text>
                )}
                {typeIdentifier && (
                  <HStack>
                    <TypeBadge
                      identifier={typeIdentifier.identifier}
                      logo={typeIdentifier.logo}
                      logoLight={typeIdentifier.logoLight}
                      logoDark={typeIdentifier.logoDark}
                      logoLightInvert={typeIdentifier.logoLightInvert}
                      logoDarkInvert={typeIdentifier.logoDarkInvert}
                      logoHeight={typeIdentifier.logoHeight}
                    />
                  </HStack>
                )}
              </HStack>

              <Box onClick={(event) => event.stopPropagation()}>
                <Menu isLazy autoSelect={false} placement="left">
                  <MenuButton as={MenuBtn} />
                  <Portal>
                    <MenuList minW={32} zIndex={1500}>
                      <MenuGroup title={wallet.name}>
                        {account && (
                          <>
                            <MenuItem
                              icon={<CheckIcon />}
                              iconSpacing={2}
                              isDisabled={subWallet?.isSelected}
                              onClick={() => {
                                onSelected({
                                  id: wallet.id,
                                  subId: subWallet?.subWallet.id
                                })
                                onClose()
                              }}>
                              Select
                            </MenuItem>
                            <MenuItem
                              icon={<Icon as={MdQrCode} />}
                              iconSpacing={2}
                              isDisabled={!account.address}
                              onClick={() => onDetailOpen(account)}>
                              Account detail
                            </MenuItem>
                            <MenuItem
                              icon={<ExternalLinkIcon />}
                              iconSpacing={2}
                              isDisabled={!accountUrl}
                              onClick={() => {
                                browser.tabs.create({ url: accountUrl }).then()
                              }}>
                              View account on block explorer
                            </MenuItem>
                          </>
                        )}
                      </MenuGroup>
                    </MenuList>
                  </Portal>
                </Menu>
              </Box>
            </HStack>

            {isWalletGroup(wallet.type) &&
              (isOpen ? (
                <ChevronDownIcon color="gray.500" />
              ) : (
                <ChevronUpIcon color="gray.500" />
              ))}
          </HStack>
        </Box>
      </Button>

      {isOpen && network && isWalletGroup(wallet.type) && (
        <SubWalletList
          network={network}
          wallet={wallet}
          subWallets={subWallets}
          onSelectedId={(id) => {
            onSelected(id)
            onClose()
          }}
          measure={measure}
          setSubScrollOffset={setSubScrollOffset}
        />
      )}
    </Box>
  )
}
