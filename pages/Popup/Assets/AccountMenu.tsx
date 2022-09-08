import { EditIcon, ExternalLinkIcon } from '@chakra-ui/icons'
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
import { QRCodeSVG } from 'qrcode.react'
import { useMemo } from 'react'
import { FaExpandAlt, FaPlug } from 'react-icons/fa'
import { MdMoreVert, MdQrCode } from 'react-icons/md'
import browser from 'webextension-polyfill'

import { AccountAvatar } from '~components/AccountAvatar'
import { CopyArea } from '~components/CopyIcon'
import { useActive } from '~lib/active'
import { IChainAccount, ISubWallet, IWallet, PSEUDO_INDEX } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'
import { WalletType, hasWalletKeystore } from '~lib/wallet'
import { ExportMnemonicModal } from '~pages/Settings/SettingsWallets/ExportMnemonicModal'
import { ExportPrivateKeyModal } from '~pages/Settings/SettingsWallets/ExportPrivateKeyModal'
import { SubWalletNameEdit } from '~pages/Settings/SettingsWallets/SubWalletEdit'
import { WalletNameEdit } from '~pages/Settings/SettingsWallets/WalletEdit'

export const AccountMenu = () => {
  const { network, wallet, subWallet, account } = useActive()

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
            isDisabled={!account.address}
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
        onOpen={onDetailOpen}
        onClose={onDetailClose}
        wallet={wallet}
        subWallet={subWallet}
        account={account}
        accountUrl={accountUrl}
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

            <Stack align="center" p={8} spacing={8}>
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
                          <Text noOfLines={2} fontSize="lg" fontWeight="medium">
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
                    Export Secret Phrase
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
        isOpen={isExportMnemonicOpen}
        onClose={() => {
          onExportMnemonicClose()
          onOpen()
        }}
      />
    </>
  )
}
