import { CheckIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Box,
  BoxProps,
  Button,
  ComponentWithAs,
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
import { MdOutlineMoreHoriz } from '@react-icons/all-files/md/MdOutlineMoreHoriz'
import { MdQrCode } from '@react-icons/all-files/md/MdQrCode'
import browser from 'webextension-polyfill'

import { AccountAvatar } from '~components/AccountAvatar'
import { useAccountDetailModal } from '~components/AccountDetailModal'
import { BtnBox } from '~components/BtnBox'
import { formatNumber } from '~lib/formatNumber'
import { INetwork } from '~lib/schema'
import { getAccountUrl } from '~lib/services/network'
import { Amount } from '~lib/services/token'
import { SubWalletEntry } from '~lib/services/wallet/tree'
import { shortenString } from '~lib/utils'

export const SubWalletItem = ({
  network,
  subWallet,
  balance,
  onSelected
}: {
  network: INetwork
  subWallet: SubWalletEntry
  balance?: Amount
  onSelected: () => void
}) => {
  const { subWallet: wallet, account, isSelected } = subWallet

  const { onOpen: onDetailOpen } = useAccountDetailModal()

  const accountUrl = getAccountUrl(network, account)

  return (
    <Button
      key={wallet.id}
      variant="ghost"
      size="lg"
      w="full"
      h={16}
      px={4}
      justifyContent="start"
      onClick={onSelected}>
      <Box w="full">
        <HStack w="full" justify="space-between">
          <HStack w="calc(100% - 29.75px)" justify="space-between">
            <AccountAvatar
              text={account.address || ''}
              scale={0.8}
              m="-3px"
              mb="-16px"
            />

            <HStack
              w="calc(100% - 31px)"
              justify="space-between"
              align="baseline">
              <Text fontSize="lg" noOfLines={1} display="block">
                {wallet.name}
              </Text>

              <Text
                sx={{ fontFeatureSettings: '"tnum"' }}
                fontSize="sm"
                color="gray.500">
                {shortenString(account.address)}
              </Text>
            </HStack>
          </HStack>

          {subWallet.isSelected && (
            <CheckIcon fontSize="lg" color="green.500" />
          )}
        </HStack>

        <HStack w="calc(100% - 29.75px)" justify="space-between">
          <Text ps="32px" fontSize="xs" color="gray.500" textAlign="start">
            {balance && (
              <>
                {formatNumber(balance.amount)} {balance.symbol}
              </>
            )}
          </Text>

          <Box onClick={(event) => event.stopPropagation()}>
            <Menu isLazy autoSelect={false} placement="left">
              <MenuButton as={MenuBtn} />
              <Portal>
                <MenuList minW={32} zIndex={1500}>
                  <MenuGroup title={wallet.name}>
                    <MenuItem
                      icon={<CheckIcon />}
                      iconSpacing={2}
                      isDisabled={isSelected}
                      onClick={onSelected}>
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
                  </MenuGroup>
                </MenuList>
              </Portal>
            </Menu>
          </Box>
        </HStack>
      </Box>
    </Button>
  )
}

export const MenuBtn: ComponentWithAs<'div', BoxProps> = forwardRef<
  BoxProps,
  'div'
>((props, ref) => (
  <BtnBox ref={ref} {...props} fontSize="xl" height="1em">
    <Icon
      as={MdOutlineMoreHoriz}
      color={useColorModeValue('gray.500', 'gray.500')}
      _active={{ color: useColorModeValue('gray.700', 'whiteAlpha.600') }}
      fontSize="xl"
    />
  </BtnBox>
))
