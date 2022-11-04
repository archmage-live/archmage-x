import { DeleteIcon, EditIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  HStack,
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
  Popover,
  PopoverAnchor,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import { FaExpandAlt } from '@react-icons/all-files/fa/FaExpandAlt'
import { FaPlug } from '@react-icons/all-files/fa/FaPlug'
import { MdMoreVert } from '@react-icons/all-files/md/MdMoreVert'
import { MdQrCode } from '@react-icons/all-files/md/MdQrCode'
import { QRCodeSVG } from 'qrcode.react'
import browser from 'webextension-polyfill'

import { AccountAvatar } from '~components/AccountAvatar'
import { CopyArea } from '~components/CopyIcon'
import { useActive } from '~lib/active'
import { IChainAccount, ISubWallet, IWallet, PSEUDO_INDEX } from '~lib/schema'
import { getAccountUrl } from '~lib/services/network'
import { WalletInfo } from '~lib/services/wallet'
import { createTab } from '~lib/util'
import { WalletType, hasWalletKeystore } from '~lib/wallet'
import { ConnectedSitesModal } from '~pages/Popup/Assets/ConnectedSites'
import { DeleteWalletModal } from '~pages/Settings/SettingsWallets/DeleteWalletModal'
import { ExportMnemonicModal } from '~pages/Settings/SettingsWallets/ExportMnemonicModal'
import { ExportPrivateKeyModal } from '~pages/Settings/SettingsWallets/ExportPrivateKeyModal'
import { SubWalletNameEdit } from '~pages/Settings/SettingsWallets/SubWalletEdit'
import { WalletNameEdit } from '~pages/Settings/SettingsWallets/WalletEdit'

export const AccountMenu = () => {
  const { network, wallet, subWallet, account } = useActive()

  const accountUrl = network && account && getAccountUrl(network, account)

  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onClose: onDetailClose
  } = useDisclosure()

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
            isDisabled={!account.address}
            onClick={onDetailOpen}>
            Account detail
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
              createTab('#/')
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

      <AccountDetailModal
        isOpen={isDetailOpen}
        onOpen={onDetailOpen}
        onClose={onDetailClose}
        wallet={wallet}
        subWallet={subWallet}
        account={account}
        accountUrl={accountUrl}
      />

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

const AccountDetailModal = ({
  isOpen,
  onOpen,
  onClose,
  wallet,
  subWallet,
  account,
  accountUrl
}: {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
  accountUrl?: string
}) => {
  const {
    isOpen: isExportMnemonicOpen,
    onOpen: onExportMnemonicOpen,
    onClose: onExportMnemonicClose
  } = useDisclosure()

  const {
    isOpen: isExportPrivateKeyOpen,
    onOpen: onExportPrivateKeyOpen,
    onClose: onExportPrivateKeyClose
  } = useDisclosure()

  const qrCodeBg = useColorModeValue('white', 'black')
  const qrCodeFg = useColorModeValue('black', 'white')

  const notBackedUp = (wallet.info as WalletInfo)?.notBackedUp

  if (!account.address) {
    return <></>
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
        <ModalOverlay />
        <ModalContent top="15px" my={0}>
          <ModalCloseButton />
          <ModalBody p={0}>
            <Center>
              <AccountAvatar text={account.address} scale={6} mt="-30px" />
            </Center>

            <Stack p={8} spacing={8}>
              <Center>
                <Popover isLazy>
                  <HStack>
                    <Box w={12}></Box>

                    <PopoverAnchor>
                      <Stack maxW={64} spacing={0} align="center">
                        <Text noOfLines={2} fontSize="lg" fontWeight="medium">
                          {wallet.name}
                        </Text>
                        {subWallet.index !== PSEUDO_INDEX && (
                          <>
                            <Text fontSize="xs" color="gray.500">
                              /
                            </Text>
                            <Text
                              noOfLines={2}
                              fontSize="lg"
                              fontWeight="medium">
                              {subWallet.name}
                            </Text>
                          </>
                        )}
                      </Stack>
                    </PopoverAnchor>

                    <PopoverTrigger>
                      <IconButton
                        variant="link"
                        aria-label="Edit name"
                        icon={<EditIcon />}
                      />
                    </PopoverTrigger>
                  </HStack>
                  <PopoverContent>
                    <PopoverArrow />
                    <PopoverBody>
                      <Stack p={2} spacing={4}>
                        <WalletNameEdit wallet={wallet} />
                        {subWallet.index !== PSEUDO_INDEX && (
                          <SubWalletNameEdit
                            wallet={wallet}
                            subWallet={subWallet}
                          />
                        )}
                      </Stack>
                    </PopoverBody>
                  </PopoverContent>
                </Popover>
              </Center>

              <Stack align="center" spacing={6}>
                <QRCodeSVG
                  value={account.address}
                  size={144}
                  bgColor={qrCodeBg}
                  fgColor={qrCodeFg}
                  level={'L'}
                  includeMargin={false}
                />

                <CopyArea
                  name="Address"
                  copy={account.address}
                  props={{ w: 64 }}
                />
              </Stack>

              <Stack>
                {accountUrl && (
                  <Button
                    colorScheme="gray"
                    onClick={() => {
                      browser.tabs.create({ url: accountUrl })
                    }}>
                    View account on block explorer
                  </Button>
                )}

                {hasWalletKeystore(wallet.type) && (
                  <Button
                    colorScheme="gray"
                    onClick={() => {
                      onClose()
                      onExportPrivateKeyOpen()
                    }}>
                    Export Private Key
                  </Button>
                )}

                {wallet.type === WalletType.HD && (
                  <Button
                    colorScheme="gray"
                    onClick={() => {
                      onClose()
                      onExportMnemonicOpen()
                    }}>
                    {!notBackedUp
                      ? 'Export Secret Phrase'
                      : 'Back up Secret Phrase'}
                  </Button>
                )}
              </Stack>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>

      <ExportPrivateKeyModal
        account={account}
        isOpen={isExportPrivateKeyOpen}
        onClose={() => {
          onExportPrivateKeyClose()
          onOpen()
        }}
      />

      <ExportMnemonicModal
        walletId={wallet.id}
        notBackedUp={notBackedUp}
        isOpen={isExportMnemonicOpen}
        onClose={() => {
          onExportMnemonicClose()
          onOpen()
        }}
        size="full"
      />
    </>
  )
}
