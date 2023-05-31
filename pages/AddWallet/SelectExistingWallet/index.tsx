import {
  Divider,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text
} from '@chakra-ui/react'

import { NetworkKind, getNetworkScope } from '~lib/network'
import {
  ExistingGroupWallet,
  useExistingGroupWallets
} from '~lib/services/wallet'
import { WalletType } from '~lib/wallet'

import { WalletList } from './WalletList'

export { WalletItemButton } from './WalletItem'

export const SelectExistingWallet = ({
  networkKind,
  walletType,
  selected,
  onSelected,
  isOpen,
  onClose
}: {
  networkKind?: NetworkKind
  walletType: WalletType
  selected?: ExistingGroupWallet
  onSelected: (wallet: ExistingGroupWallet) => void
  isOpen: boolean
  onClose: () => void
}) => {
  const wallets = useExistingGroupWallets(walletType, networkKind)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      returnFocusOnClose={false}
      isCentered
      motionPreset="slideInBottom"
      scrollBehavior="inside"
      size="lg">
      <ModalOverlay />
      <ModalContent maxH="100%" my={0}>
        <ModalHeader>Select Wallet</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={0}>
          <Stack px={4} pb={6} spacing={6}>
            {!wallets?.length ? (
              !networkKind ? (
                <Text fontSize="lg" textAlign="center">
                  No existing group wallets.
                </Text>
              ) : (
                <Text fontSize="lg" textAlign="center">
                  No existing group wallets for {getNetworkScope(networkKind)}
                  &nbsp;networks.
                </Text>
              )
            ) : (
              <Stack spacing={4}>
                <Divider />

                <WalletList
                  wallets={wallets}
                  selected={selected}
                  onSelected={(w) => {
                    onSelected(w)
                    onClose()
                  }}
                />

                <Divider />
              </Stack>
            )}
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
