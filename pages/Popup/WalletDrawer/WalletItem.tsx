import { AddIcon, CheckIcon } from '@chakra-ui/icons'
import {
  Box,
  BoxProps,
  Button,
  Checkbox,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Portal,
  Text,
  forwardRef,
  useColorModeValue
} from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MdOutlineMoreHoriz } from 'react-icons/md'

import { AccountAvatar } from '~components/AccountAvatar'
import { Badge } from '~components/Badge'
import { BtnBox } from '~components/BtnBox'
import { WalletId } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { INetwork } from '~lib/schema/network'
import { useBalance } from '~lib/services/provider'
import { WALLET_SERVICE } from '~lib/services/walletService'
import { shortenAddress } from '~lib/utils'
import { WalletType, getWalletTypeIdentifier, isWalletGroup } from '~lib/wallet'
import { WalletEntry } from '~pages/Popup/WalletDrawer/tree'

import { MenuBtn } from './SubWalletItem'
import { SubWalletList } from './SubWalletList'

interface WalletItemProps {
  network?: INetwork
  walletEntry: WalletEntry
  onToggleOpen: (id: number) => void
  onSelected?: (selected: WalletId) => void
  activeId?: WalletId
  onClose?: () => void
  onChecked?: (selected: WalletId | number, isChecked: boolean) => void
  measureElement?: (element?: HTMLElement | null) => any
}

export const WalletItem = ({
  network,
  walletEntry,
  onToggleOpen,
  onSelected,
  activeId,
  onClose,
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

  const account = !isWalletGroup(wallet.type)
    ? subWallets[0].account
    : undefined

  const balance = useBalance(network, account)

  const [isChecked, setIsChecked] = useState<boolean>()
  const [isIndeterminate, setIsIndeterminate] = useState<boolean>()

  useEffect(() => {
    if (!onChecked) {
      return
    }

    if (!isWalletGroup(wallet.type)) {
      setIsChecked(subWallets?.[0].isChecked)
      return
    }

    const all = subWallets?.every((subWallet) => subWallet.isChecked)
    const none = subWallets?.every((subWallet) => !subWallet.isChecked)

    setIsChecked(all)
    setIsIndeterminate(!none && !all)
  }, [onChecked, wallet, subWallets])

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
  }, [network, wallet])

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
              onSelected?.({
                id: wallet.id,
                subId: subWallets?.[0].subWallet.id
              })
            }
            onClose?.()
            onChecked?.(wallet.id, !isChecked)
          }
        }}>
        <Box w="full">
          <HStack w="full" justify="space-between">
            {onChecked !== undefined && (
              <Checkbox
                mb="-12px"
                isIndeterminate={isIndeterminate}
                isChecked={isChecked}
                pointerEvents={!isWalletGroup(wallet.type) ? 'none' : undefined}
                onChange={(e) => {
                  onChecked?.(wallet.id, e.target.checked)
                }}
              />
            )}

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
                  <Text fontFamily="monospace" fontSize="sm" color="gray.500">
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

            {activeId?.id === wallet.id && (
              <CheckIcon fontSize="lg" color="green.500" />
            )}
          </HStack>

          <HStack
            w="calc(100% - 29.75px)"
            ps={onChecked !== undefined ? '62px' : '32px'}
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
                      <MenuItem
                        icon={<AddIcon w={3} h={3} />}
                        iconSpacing={2}
                        onClick={onAddAccount}>
                        Add account
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
            onSelected?.(id)
            onClose?.()
          }}
          activeId={activeId}
          onChecked={onChecked}
          onClose={onClose}
          measure={measure}
        />
      )}
    </Box>
  )
}
