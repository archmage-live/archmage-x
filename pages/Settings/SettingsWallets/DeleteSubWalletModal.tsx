import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  ModalProps,
  Stack,
  Text
} from '@chakra-ui/react'
import { atom, useAtom } from 'jotai'
import { useCallback } from 'react'
import browser from 'webextension-polyfill'

import { AlertBox } from '~components/AlertBox'
import { CopyArea } from '~components/CopyIcon'
import {
  getActiveWallet,
  resetActiveWallet,
  useActiveNetwork
} from '~lib/active'
import { IChainAccount, ISubWallet, IWallet, PSEUDO_INDEX } from '~lib/schema'
import { getAccountUrl } from '~lib/services/network'
import {
  WALLET_SERVICE,
  useSubWalletByIndex,
  useWallet
} from '~lib/services/walletService'
import { shortenAddress } from '~lib/utils'
import { WalletType } from '~lib/wallet'

interface DeleteSubWalletModalProps {
  wallet?: IWallet
  subWallet?: ISubWallet
  account?: IChainAccount
  accountUrl?: string
  isOpen: boolean
  onClose: () => void
  size?: ModalProps['size']
}

export const DeleteSubWalletModal = ({
  wallet,
  subWallet,
  account,
  accountUrl,
  isOpen,
  onClose,
  size
}: DeleteSubWalletModalProps) => {
  if (!wallet || !subWallet || !account?.address) {
    return <></>
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      motionPreset="slideInBottom"
      scrollBehavior="inside"
      size={size || 'lg'}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">Delete Account?</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack pb={8} spacing={8}>
            <Stack
              spacing={0}
              py="2"
              px="4"
              borderRadius="4px"
              borderWidth="1px"
              borderColor="gray.500"
              align="center">
              <HStack>
                <Box w={12}></Box>
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

                <IconButton
                  variant="link"
                  aria-label="View account on block explorer"
                  icon={<ExternalLinkIcon />}
                  onClick={() => {
                    browser.tabs.create({ url: accountUrl })
                  }}
                />
              </HStack>

              <CopyArea
                name="Address"
                copy={account.address}
                area={shortenAddress(account.address)}
                props={{
                  bg: undefined,
                  color: undefined,
                  _hover: undefined
                }}
              />
            </Stack>

            <AlertBox>
              This account will be removed from your wallet.
              {wallet.type === WalletType.HD ? (
                <>
                  You can recover this account again from the wallet management
                  settings. You can also create new accounts again from the
                  account drop-down.
                </>
              ) : wallet.type === WalletType.PRIVATE_KEY ||
                wallet.type === WalletType.PRIVATE_KEY_GROUP ? (
                <>
                  Please make sure you have the original Secret Recovery Phrase
                  or Private Key for this imported account before continuing.
                  You can import accounts again from the account drop-down.
                </>
              ) : wallet.type === WalletType.WATCH ||
                wallet.type === WalletType.WATCH_GROUP ? (
                <>
                  You can import watch accounts again from the account
                  drop-down.
                </>
              ) : wallet.type === WalletType.HW ||
                wallet.type === WalletType.HW_GROUP ? (
                <>
                  You can connect hardware wallets again from the account
                  drop-down.
                </>
              ) : (
                <></>
              )}
            </AlertBox>

            <HStack>
              <Button
                variant="outline"
                colorScheme="purple"
                flex={1}
                onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                flex={1}
                onClick={async () => {
                  await WALLET_SERVICE.deleteSubWallet(subWallet.id)
                  await getActiveWallet()
                  onClose()
                }}>
                Delete
              </Button>
            </HStack>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const isOpenAtom = atom<boolean>(false)
const deleteAccountAtom = atom<IChainAccount | undefined>(undefined)

export function useDeleteSubWalletModal() {
  const [isOpen, setIsOpen] = useAtom(isOpenAtom)
  const [account, setAccount] = useAtom(deleteAccountAtom)

  const onOpen = useCallback(
    (account: IChainAccount) => {
      setIsOpen(true)
      setAccount(account)
    },
    [setAccount, setIsOpen]
  )
  const onClose = useCallback(() => setIsOpen(false), [setIsOpen])

  return {
    isOpen,
    account,
    onOpen,
    onClose
  }
}

export const WrappedDeleteSubWalletModal = () => {
  const { account, isOpen, onClose } = useDeleteSubWalletModal()

  const { network } = useActiveNetwork()

  const wallet = useWallet(account?.masterId)
  const subWallet = useSubWalletByIndex(account?.masterId, account?.index)

  const accountUrl = network && account && getAccountUrl(network, account)

  return (
    <DeleteSubWalletModal
      wallet={wallet}
      subWallet={subWallet}
      account={account}
      accountUrl={accountUrl}
      isOpen={isOpen}
      onClose={onClose}
    />
  )
}
