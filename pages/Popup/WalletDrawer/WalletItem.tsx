import {
  AddIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DeleteIcon,
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
import { MdOutlineArrowDownward } from '@react-icons/all-files/md/MdOutlineArrowDownward'
import { MdOutlineArrowUpward } from '@react-icons/all-files/md/MdOutlineArrowUpward'
import { MdOutlineVerticalAlignBottom } from '@react-icons/all-files/md/MdOutlineVerticalAlignBottom'
import { MdOutlineVerticalAlignTop } from '@react-icons/all-files/md/MdOutlineVerticalAlignTop'
import { MdQrCode } from '@react-icons/all-files/md/MdQrCode'
import { useCallback, useEffect, useRef } from 'react'
import browser from 'webextension-polyfill'

import { AccountAvatar } from '~components/AccountAvatar'
import { useAccountDetailModal } from '~components/AccountDetailModal'
import { useDeleteWalletModal } from '~components/DeleteWalletModal'
import { TypeBadge } from '~components/TypeBadge'
import { WalletId } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { INetwork } from '~lib/schema/network'
import { getAccountUrl } from '~lib/services/network'
import { Amount } from '~lib/services/token'
import { WALLET_SERVICE } from '~lib/services/wallet'
import {
  localReorderSubWallets,
  persistReorderSubWallets
} from '~lib/services/wallet/reorder'
import { SubWalletEntry, WalletEntry } from '~lib/services/wallet/tree'
import { shortenString } from '~lib/utils'
import { WalletType, getWalletTypeIdentifier, isWalletGroup } from '~lib/wallet'

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
  reorderWallets: (
    network: WalletEntry,
    placement: 'top' | 'up' | 'down' | 'bottom'
  ) => void
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
  reorderWallets,
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

  const reorderSubWallets = useCallback(
    async (
      subWallet: SubWalletEntry,
      placement: 'top' | 'up' | 'down' | 'bottom'
    ) => {
      if (subWallets.length <= 1) {
        return
      }
      const sourceIndex = subWallets.findIndex(
        (w) => w.subWallet.id === subWallet.subWallet.id
      )
      if (sourceIndex < 0) {
        return
      }
      let destinationIndex
      switch (placement) {
        case 'top':
          if (sourceIndex === 0) return
          destinationIndex = 0
          break
        case 'up':
          if (sourceIndex === 0) return
          destinationIndex = sourceIndex - 1
          break
        case 'down':
          if (sourceIndex === subWallets.length - 1) return
          destinationIndex = sourceIndex + 1
          break
        case 'bottom':
          if (sourceIndex === subWallets.length - 1) return
          destinationIndex = subWallets.length - 1
          break
      }

      const [, startSortId, endSortId] = localReorderSubWallets(
        subWallets,
        sourceIndex,
        destinationIndex
      )
      await persistReorderSubWallets(wallet.id, startSortId, endSortId)
    },
    [wallet, subWallets]
  )

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
                        <MenuItem
                          icon={<MdOutlineVerticalAlignTop />}
                          iconSpacing={2}
                          onClick={() => reorderWallets(walletEntry, 'top')}>
                          Top
                        </MenuItem>
                        <MenuItem
                          icon={<MdOutlineArrowUpward />}
                          iconSpacing={2}
                          onClick={() => reorderWallets(walletEntry, 'up')}>
                          Up
                        </MenuItem>
                        <MenuItem
                          icon={<MdOutlineArrowDownward />}
                          iconSpacing={2}
                          onClick={() => reorderWallets(walletEntry, 'down')}>
                          Down
                        </MenuItem>
                        <MenuItem
                          icon={<MdOutlineVerticalAlignBottom />}
                          iconSpacing={2}
                          onClick={() => reorderWallets(walletEntry, 'bottom')}>
                          Bottom
                        </MenuItem>
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
          onDelete={onDeleteWallet}
          measure={measure}
          reorderSubWallets={reorderSubWallets}
          setSubScrollOffset={setSubScrollOffset}
        />
      )}
    </Box>
  )
}
