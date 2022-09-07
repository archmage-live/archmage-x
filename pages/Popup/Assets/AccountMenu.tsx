import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList
} from '@chakra-ui/react'
import { FaExpandAlt, FaPlug } from 'react-icons/fa'
import { MdMoreVert, MdQrCode } from 'react-icons/md'

export const AccountMenu = () => {
  return (
    <Menu isLazy autoSelect={false} placement="bottom-start">
      <MenuButton
        variant="link"
        minW={0}
        as={IconButton}
        icon={<Icon as={MdMoreVert} fontSize="xl" />}
      />

      <MenuList w={48}>
        <MenuItem
          icon={<ExternalLinkIcon />}
          iconSpacing={2}
          onClick={() => {}}>
          View account on block explorer
        </MenuItem>
        <MenuItem
          icon={<Icon as={MdQrCode} />}
          iconSpacing={2}
          onClick={() => {}}>
          Account detail
        </MenuItem>
        <MenuItem
          icon={<Icon as={FaPlug} />}
          iconSpacing={2}
          onClick={() => {}}>
          Connected sites
        </MenuItem>
        <MenuItem
          icon={<Icon as={FaExpandAlt} />}
          iconSpacing={2}
          onClick={() => {}}>
          Expand view
        </MenuItem>
      </MenuList>
    </Menu>
  )
}
