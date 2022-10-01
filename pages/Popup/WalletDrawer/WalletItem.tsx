import { AddIcon, CheckIcon, DeleteIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Portal,
  Text
} from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { AccountAvatar } from '~components/AccountAvatar'
import { Badge } from '~components/Badge'
import { WalletId } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { INetwork } from '~lib/schema/network'
import { Balance } from '~lib/services/token'
import { WALLET_SERVICE } from '~lib/services/walletService'
import { shortenAddress } from '~lib/utils'
import { WalletType, getWalletTypeIdentifier, isWalletGroup } from '~lib/wallet'
import { WalletEntry } from '~pages/Popup/WalletDrawer/tree'
import { useDeleteWalletModal } from '~pages/Settings/SettingsWallets/DeleteWalletModal'

import { MenuBtn } from './SubWalletItem'
import { SubWalletList } from './SubWalletList'

interface WalletItemProps {
  network?: INetwork
  walletEntry: WalletEntry
  balance?: Balance
  onToggleOpen: (id: number) => void
  onSelected: (selected: WalletId) => void
  onClose: () => void
  measureElement?: (element?: HTMLElement | null) => any
}

export const WalletItem = ({
  network,
  walletEntry,
  balance,
  onToggleOpen,
  onSelected,
  onClose,
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

  const typeIdentifier = getWalletTypeIdentifier(wallet.type)

  const [scrollIndex, setScrollIndex] = useState<number>()

  const onAddAccount = useCallback(async () => {
    switch (wallet.type) {
      case WalletType.HD:
        await WALLET_SERVICE.deriveSubWallets(wallet.id, 1)
        if (network) {
          await WALLET_SERVICE.ensureChainAccounts(
            wallet.id,
            network.kind,
            network.chainId
          )
        }
        break
    }
    // TODO
  }, [network, wallet])

  const { onOpen: onDeleteWallet } = useDeleteWalletModal()

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

            {subWallets.some((entry) => entry.isSelected) && (
              <CheckIcon fontSize="lg" color="green.500" />
            )}
          </HStack>

          <HStack
            w="calc(100% - 29.75px)"
            ps={'32px'}
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

            <Box onClick={(event) => event.stopPropagation()}>
              <Menu isLazy autoSelect={false} placement="left">
                <MenuButton as={MenuBtn} />
                <Portal>
                  <MenuList minW={32} zIndex={1500}>
                    <MenuGroup title={wallet.name}>
                      {account && (
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
                      )}
                      {wallet.type === WalletType.HD && (
                        <MenuItem
                          icon={<AddIcon w={3} h={3} />}
                          iconSpacing={2}
                          onClick={onAddAccount}>
                          Add account
                        </MenuItem>
                      )}
                      <MenuItem
                        icon={<DeleteIcon />}
                        iconSpacing={2}
                        onClick={() =>
                          onDeleteWallet({
                            all: true,
                            wallet
                          })
                        }>
                        Remove {subWallet ? 'account' : 'wallet'}
                      </MenuItem>
                    </MenuGroup>
                  </MenuList>
                </Portal>
              </Menu>
            </Box>
          </HStack>
        </Box>
      </Button>

      {isOpen && network && isWalletGroup(wallet.type) && (
        <SubWalletList
          network={network}
          subWallets={subWallets}
          scrollIndex={scrollIndex}
          setScrollIndex={setScrollIndex}
          onSelectedId={(id) => {
            onSelected(id)
            onClose()
          }}
          onDelete={onDeleteWallet}
          measure={measure}
        />
      )}
    </Box>
  )
}
