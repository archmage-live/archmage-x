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
  Stack,
  Text,
  forwardRef,
  useColorModeValue
} from '@chakra-ui/react'
import { MdOutlineMoreHoriz } from 'react-icons/md'

import { AccountAvatar } from '~components/AccountAvatar'
import { BtnBox } from '~components/BtnBox'
import { formatNumber } from '~lib/formatNumber'
import { IChainAccount, INetwork, ISubWallet } from '~lib/schema'
import { useBalance } from '~lib/services/provider'
import { shortenAddress } from '~lib/utils'
import { SubWalletEntry } from '~pages/Popup/WalletDrawer/tree'
import { useDeleteSubWalletModal } from '~pages/Settings/SettingsWallets/DeleteSubWalletModal'

export const SubWalletItem = ({
  network,
  subWallet,
  onSelected,
  active,
  onChecked,
  onClose
}: {
  network: INetwork
  subWallet: SubWalletEntry
  onSelected?: () => void
  active?: boolean
  onChecked?: (checked: boolean) => void
  onClose?: () => void
}) => {
  const {
    subWallet: wallet,
    account,
    isSelected: selected,
    isChecked
  } = subWallet
  const balance = useBalance(network, account)

  const { onOpen: onDeleteAccount } = useDeleteSubWalletModal()

  return (
    <Button
      key={wallet.id}
      variant="ghost"
      size="lg"
      w="full"
      h={16}
      px={4}
      justifyContent="start"
      onClick={() => {
        onSelected?.()
        onChecked?.(!isChecked)
      }}>
      <Box w="full">
        <HStack w="full" justify="space-between">
          {onChecked !== undefined && (
            <Checkbox mb="-12px" isChecked={isChecked} pointerEvents="none" />
          )}
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

              <Text fontFamily="monospace" fontSize="sm" color="gray.500">
                {shortenAddress(account.address)}
              </Text>
            </HStack>
          </HStack>

          {active && <CheckIcon fontSize="lg" color="green.500" />}
        </HStack>

        <HStack w="calc(100% - 29.75px)" justify="space-between">
          <Text
            ps={onChecked !== undefined ? '62px' : '32px'}
            fontSize="xs"
            color="gray.500"
            textAlign="start">
            {formatNumber(balance?.amount)} {balance?.symbol}
          </Text>

          <Box onClick={(event) => event.stopPropagation()}>
            <Menu isLazy autoSelect={false} placement="left">
              <MenuButton as={MenuBtn} />
              <Portal>
                <MenuList minW={32} zIndex={1500}>
                  <MenuGroup title={wallet.name}>
                    <MenuItem
                      icon={<AddIcon w={3} h={3} />}
                      iconSpacing={2}
                      onClick={() => {
                        onDeleteAccount(account)
                        onClose?.()
                      }}>
                      Remove account
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

export const MenuBtn = forwardRef<BoxProps, 'div'>((props, ref) => (
  <BtnBox ref={ref} {...props}>
    <Icon
      as={MdOutlineMoreHoriz}
      color={useColorModeValue('gray.500', 'gray.500')}
      _active={{ color: useColorModeValue('gray.700', 'whiteAlpha.600') }}
      fontSize="xl"
    />
  </BtnBox>
))
