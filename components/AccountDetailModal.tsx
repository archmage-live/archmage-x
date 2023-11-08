import { EditIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  HStack,
  IconButton,
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
  Stack,
  Text,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import { atom, useAtom } from 'jotai'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback } from 'react'
import browser from 'webextension-polyfill'

import { AccountAvatar } from '~components/AccountAvatar'
import { CopyArea } from '~components/CopyIcon'
import { ExportMnemonicModal } from '~components/ExportMnemonicModal'
import { ExportPrivateKeyModal } from '~components/ExportPrivateKeyModal'
import { SubWalletNameEdit, WalletNameEdit } from '~components/WalletNameEdit'
import { useActive } from '~lib/active'
import {
  IChainAccount,
  INetwork,
  ISubWallet,
  IWallet,
  PSEUDO_INDEX,
  WalletInfo
} from '~lib/schema'
import { NETWORK_SERVICE, getAccountUrl } from '~lib/services/network'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { WalletType, hasWalletKeystore } from '~lib/wallet'

const isOpenAccountDetailModalAtom = atom<boolean>(false)
const accountDetailModalArgsAtom = atom<
  | {
      network: INetwork
      wallet: IWallet
      subWallet: ISubWallet
      account: IChainAccount
    }
  | undefined
>(undefined)

export function useAccountDetailModal() {
  const [isOpenAccountDetailModal, setIsOpenAccountDetailModal] = useAtom(
    isOpenAccountDetailModalAtom
  )
  const [accountDetailModalArgs, setAccountDetailModalArgs] = useAtom(
    accountDetailModalArgsAtom
  )

  const onOpen = useCallback(
    async (account?: IChainAccount, noAccountChange?: boolean) => {
      let args
      if (account) {
        const network = await NETWORK_SERVICE.getNetwork({
          kind: account.networkKind,
          chainId: account.chainId
        })
        const wallet = await WALLET_SERVICE.getWallet(account.masterId)
        const subWallet = await WALLET_SERVICE.getSubWallet({
          masterId: account.masterId,
          index: account.index
        })
        if (network && wallet && subWallet) {
          args = {
            network,
            wallet,
            subWallet,
            account
          }
        }
      }

      setIsOpenAccountDetailModal(true)

      if (!noAccountChange) {
        setAccountDetailModalArgs(args)
      }
    },
    [setIsOpenAccountDetailModal, setAccountDetailModalArgs]
  )
  const onClose = useCallback(() => {
    setIsOpenAccountDetailModal(false)
  }, [setIsOpenAccountDetailModal])

  return {
    isOpen: isOpenAccountDetailModal,
    onOpen,
    onClose,
    args: accountDetailModalArgs
  }
}

export const AccountDetailModal = () => {
  const { network: n, wallet: w, subWallet: s, account: a } = useActive()

  const { isOpen, onOpen, onClose, args } = useAccountDetailModal()

  const network = args?.network ?? n
  const wallet = args?.wallet ?? w
  const subWallet = args?.subWallet ?? s
  const account = args?.account ?? a

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

  if (!network || !wallet || !subWallet || !account?.address) {
    return <></>
  }

  const accountUrl = getAccountUrl(network, account)

  const notBackedUp = (wallet.info as WalletInfo)?.notBackedUp

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
                        <Text
                          maxW={64}
                          noOfLines={2}
                          textAlign="center"
                          fontSize="lg"
                          fontWeight="medium">
                          {wallet.name}
                        </Text>
                        {subWallet.index !== PSEUDO_INDEX && (
                          <>
                            <Text fontSize="xs" color="gray.500">
                              /
                            </Text>
                            <Text
                              maxW={64}
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
                      browser.tabs.create({ url: accountUrl }).then()
                    }}>
                    View account on block explorer
                  </Button>
                )}

                {hasWalletKeystore(wallet) && (
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
          onOpen(undefined, true).then()
        }}
      />

      <ExportMnemonicModal
        walletId={wallet.id}
        notBackedUp={notBackedUp}
        isOpen={isExportMnemonicOpen}
        onClose={() => {
          onExportMnemonicClose()
          onOpen(undefined, true).then()
        }}
        size="full"
      />
    </>
  )
}
