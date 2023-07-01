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
  Text,
  chakra
} from '@chakra-ui/react'
import assert from 'assert'
import { atom, useAtom } from 'jotai'
import { useCallback, useState } from 'react'
import browser from 'webextension-polyfill'

import { AlertBox } from '~components/AlertBox'
import { CopyArea } from '~components/CopyIcon'
import { getActiveWallet, useActiveNetwork } from '~lib/active'
import { ISubWallet, IWallet, PSEUDO_INDEX } from '~lib/schema'
import { getAccountUrl } from '~lib/services/network'
import {
  WALLET_SERVICE,
  useChainAccountByIndex,
  useSubWalletsCount,
  useWallet
} from '~lib/services/wallet'
import { shortenString } from '~lib/utils'
import { WalletType } from '~lib/wallet'

interface DeleteWalletModalProps {
  all?: boolean
  wallet?: IWallet
  subWallet?: ISubWallet
  isOpen: boolean
  onClose: () => void
  onDelete?: () => void
  size?: ModalProps['size']
}

export const DeleteWalletModal = ({
  all,
  wallet,
  subWallet,
  isOpen,
  onClose,
  onDelete,
  size
}: DeleteWalletModalProps) => {
  const network = useActiveNetwork()
  const account = useChainAccountByIndex(
    subWallet?.masterId,
    network?.kind,
    network?.chainId,
    subWallet?.index
  )
  const accountUrl = network && account && getAccountUrl(network, account)

  const subWalletsCount = useSubWalletsCount(wallet?.id)

  const [isLoading, setIsLoading] = useState(false)

  if (!wallet || (!all && (!subWallet || !account?.address))) {
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
        <ModalHeader textAlign="center">
          Delete {!all ? 'account' : 'wallet'}?
        </ModalHeader>
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
                {!all && accountUrl && <Box w={12}></Box>}

                <Stack maxW={64} spacing={0} align="center">
                  <Text noOfLines={2} fontSize="lg" fontWeight="medium">
                    {wallet.name}
                  </Text>
                  {!all && subWallet!.index !== PSEUDO_INDEX && (
                    <>
                      <Text fontSize="xs" color="gray.500">
                        /
                      </Text>
                      <Text noOfLines={2} fontSize="lg" fontWeight="medium">
                        {subWallet!.name}
                      </Text>
                    </>
                  )}
                </Stack>

                {!all && accountUrl && (
                  <IconButton
                    variant="link"
                    aria-label="View account on block explorer"
                    icon={<ExternalLinkIcon />}
                    onClick={async () => {
                      await browser.tabs.create({ url: accountUrl })
                    }}
                  />
                )}
              </HStack>

              {!all && (
                <CopyArea
                  name="Address"
                  copy={account!.address!}
                  area={shortenString(account!.address)}
                  props={{
                    bg: undefined,
                    color: undefined,
                    _hover: undefined
                  }}
                />
              )}
            </Stack>

            <AlertBox level={!all ? 'warning' : 'error'}>
              {!all && <>This account will be removed from your wallet.</>}
              {all && (
                <>
                  This wallet (with{' '}
                  <chakra.span fontStyle="italic" fontWeight="medium">
                    {subWalletsCount}
                  </chakra.span>{' '}
                  accounts) will be removed from Archmage.
                </>
              )}
              &nbsp;
              {wallet.type === WalletType.HD ? (
                <>
                  You can recover this wallet/account again from the wallet
                  management settings. You can also create new wallets/accounts
                  again from the account drop-down.
                </>
              ) : wallet.type === WalletType.PRIVATE_KEY ||
                wallet.type === WalletType.PRIVATE_KEY_GROUP ? (
                <>
                  Please make sure you have the original Secret Recovery
                  Phrase(s) or Private Key(s) for this/these imported account(s)
                  before continuing. You can import accounts again from the
                  account drop-down.
                </>
              ) : wallet.type === WalletType.WATCH ||
                wallet.type === WalletType.WATCH_GROUP ? (
                <>
                  You can import watch accounts again from the account
                  drop-down.
                </>
              ) : wallet.type === WalletType.WALLET_CONNECT ||
                wallet.type === WalletType.WALLET_CONNECT_GROUP ? (
                <>
                  You can connect accounts with WalletConnect again from the
                  account drop-down.
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
                isDisabled={isLoading}
                onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                flex={1}
                isLoading={isLoading}
                onClick={async () => {
                  setIsLoading(true)
                  if (!all) {
                    await WALLET_SERVICE.deleteSubWallet(subWallet!.id)
                  } else {
                    await WALLET_SERVICE.deleteWallet(wallet.id)
                  }
                  await getActiveWallet()
                  setIsLoading(false)
                  onClose()
                  onDelete?.()
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

export type DeleteWalletOpts = {
  all?: boolean
  wallet?: IWallet
  subWallet?: ISubWallet
}

const isOpenAtom = atom<boolean>(false)
const deleteWalletOptsAtom = atom<DeleteWalletOpts | undefined>(undefined)

export function useDeleteWalletModal() {
  const [isOpen, setIsOpen] = useAtom(isOpenAtom)
  const [deleteOpts, setDeleteOpts] = useAtom(deleteWalletOptsAtom)

  const onOpen = useCallback(
    (opts: DeleteWalletOpts) => {
      assert(opts.all ? opts.wallet : opts.subWallet)
      setIsOpen(true)
      setDeleteOpts(opts)
    },
    [setDeleteOpts, setIsOpen]
  )
  const onClose = useCallback(() => setIsOpen(false), [setIsOpen])

  return {
    isOpen,
    deleteOpts,
    onOpen,
    onClose
  }
}

export const WrappedDeleteWalletModal = ({
  onDelete
}: {
  onDelete?: () => void
}) => {
  const { deleteOpts, isOpen, onClose } = useDeleteWalletModal()

  const wallet = useWallet(deleteOpts?.subWallet?.masterId)

  return (
    <DeleteWalletModal
      all={deleteOpts?.all}
      wallet={deleteOpts?.wallet || wallet}
      subWallet={deleteOpts?.subWallet}
      isOpen={isOpen}
      onClose={onClose}
      onDelete={onDelete}
    />
  )
}
