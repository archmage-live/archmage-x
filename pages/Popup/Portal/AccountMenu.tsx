import { DeleteIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  useDisclosure
} from '@chakra-ui/react'
import { FaExpandAlt } from '@react-icons/all-files/fa/FaExpandAlt'
import { FaPlug } from '@react-icons/all-files/fa/FaPlug'
import { MdMoreVert } from '@react-icons/all-files/md/MdMoreVert'
import { MdQrCode } from '@react-icons/all-files/md/MdQrCode'
import browser from 'webextension-polyfill'

import { useAccountDetailModal } from '~components/AccountDetailModal'
import { DeleteWalletModal } from '~components/DeleteWalletModal'
import { useActive } from '~lib/active'
import { getAccountUrl } from '~lib/services/network'
import { createTab } from '~lib/tab'
import { ConnectedSitesModal } from '~pages/Popup/Portal/ConnectedSites'

export const AccountMenu = () => {
  const { network, wallet, subWallet, account } = useActive()

  const accountUrl = network && account && getAccountUrl(network, account)

  const { onOpen: onDetailOpen } = useAccountDetailModal()

  const {
    isOpen: isConnectedSitesOpen,
    onOpen: onConnectedSitesOpen,
    onClose: onConnectedSitesClose
  } = useDisclosure()

  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose
  } = useDisclosure()

  if (!wallet || !subWallet || !account) {
    return <></>
  }

  return (
    <Menu isLazy autoSelect={false} placement="bottom-start">
      <MenuButton
        variant="link"
        minW={0}
        as={IconButton}
        icon={<Icon as={MdMoreVert} fontSize="xl" />}
      />

      <Portal>
        <MenuList w={48} zIndex={2}>
          <MenuItem
            icon={<Icon as={MdQrCode} />}
            iconSpacing={2}
            isDisabled={!account.address}
            onClick={() => onDetailOpen()}>
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
          <MenuItem
            icon={<Icon as={FaPlug} />}
            iconSpacing={2}
            onClick={onConnectedSitesOpen}>
            Connected sites
          </MenuItem>
          <MenuItem
            icon={<Icon as={FaExpandAlt} />}
            iconSpacing={2}
            onClick={() => {
              createTab('#/').then()
            }}>
            Expand view
          </MenuItem>
          <MenuItem
            icon={<DeleteIcon />}
            iconSpacing={2}
            isDisabled={!account.address}
            onClick={onDeleteOpen}>
            Remove account
          </MenuItem>
        </MenuList>
      </Portal>

      <ConnectedSitesModal
        isOpen={isConnectedSitesOpen}
        onClose={onConnectedSitesClose}
      />

      <DeleteWalletModal
        wallet={wallet}
        subWallet={subWallet}
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
      />
    </Menu>
  )
}
