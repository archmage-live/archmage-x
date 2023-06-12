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

export const SelectExistingWalletModal = ({
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

  let type
  switch (walletType) {
    case WalletType.PRIVATE_KEY_GROUP:
      type = 'private-key'
      break
    case WalletType.WATCH_GROUP:
      type = 'watch'
      break
    case WalletType.HW_GROUP:
      type = 'hardware'
      break
    case WalletType.WALLET_CONNECT_GROUP:
      type = 'WalletConnect'
      break
    case WalletType.MPC_GROUP:
      type = 'MPC'
      break
    case WalletType.MULTI_SIG_GROUP:
      type = 'MultiSig'
      break
  }

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
                  No existing {type} group wallets.
                </Text>
              ) : (
                <Text fontSize="lg" textAlign="center">
                  No existing {type} group wallets for&nbsp;
                  {getNetworkScope(networkKind)} networks.
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
