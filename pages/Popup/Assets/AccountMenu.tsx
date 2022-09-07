import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Center,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Portal,
  Stack,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo } from 'react'
import { FaExpandAlt, FaPlug } from 'react-icons/fa'
import { MdMoreVert, MdQrCode } from 'react-icons/md'
import browser from 'webextension-polyfill'

import { AccountAvatar } from '~components/AccountAvatar'
import { CopyArea, CopyButton } from '~components/CopyIcon'
import { useActive } from '~lib/active'
import { IChainAccount } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'

export const AccountMenu = () => {
  const { network, account } = useActive()

  const netInfo = network && getNetworkInfo(network)

  const accountUrl = useMemo(() => {
    if (!netInfo?.explorerUrl || !account?.address) {
      return undefined
    }
    try {
      const url = new URL(netInfo.explorerUrl)
      url.pathname = `/address/${account.address}`
      return url.toString()
    } catch {
      return undefined
    }
  }, [account, netInfo])

  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onClose: onDetailClose
  } = useDisclosure()

  return (
    <Menu isLazy autoSelect={false} placement="bottom-start">
      <MenuButton
        variant="link"
        minW={0}
        as={IconButton}
        icon={<Icon as={MdMoreVert} fontSize="xl" />}
      />

      <Portal>
        <MenuList w={48}>
          <MenuItem
            icon={<ExternalLinkIcon />}
            iconSpacing={2}
            isDisabled={!accountUrl}
            onClick={() => {
              browser.tabs.create({ url: accountUrl })
            }}>
            View account on block explorer
          </MenuItem>
          <MenuItem
            icon={<Icon as={MdQrCode} />}
            iconSpacing={2}
            isDisabled={!account?.address}
            onClick={onDetailOpen}>
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
      </Portal>

      <AccountDetailModal
        isOpen={isDetailOpen}
        onClose={onDetailClose}
        account={account}
      />
    </Menu>
  )
}

const AccountDetailModal = ({
  isOpen,
  onClose,
  account
}: {
  isOpen: boolean
  onClose: () => void
  account?: IChainAccount
}) => {
  const qrCodeBg = useColorModeValue('white', 'black')
  const qrCodeFg = useColorModeValue('black', 'white')

  if (!account?.address) {
    return <></>
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalBody p={0}>
          <Center>
            <AccountAvatar text={account.address} scale={6} mt="-30px" />
          </Center>
          <Stack align="center" p={4} spacing={4}>
            <QRCodeSVG
              value={account.address}
              size={144}
              bgColor={qrCodeBg}
              fgColor={qrCodeFg}
              level={'L'}
              includeMargin={false}
            />

            <CopyArea name="Address" copy={account.address} props={{ w: 64 }} />
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
