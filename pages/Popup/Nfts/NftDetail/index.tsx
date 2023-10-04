import { Modal, ModalBody, ModalContent, ModalOverlay } from '@chakra-ui/react'

import { NetworkKind } from '~lib/network'
import { INetwork, INft } from '~lib/schema'
import { EvmNftDetail } from '~pages/Popup/Nfts/NftDetail/evm'

export const NftDetail = ({
  network,
  nft,
  onClose
}: {
  network: INetwork
  nft: INft
  onClose: () => void
}) => {
  switch (network.kind) {
    case NetworkKind.EVM:
      return <EvmNftDetail network={network} nft={nft} onClose={onClose} />
  }

  return <></>
}

export const NftDetailModal = ({
  network,
  nft,
  isOpen,
  onClose
}: {
  network: INetwork
  nft: INft
  isOpen: boolean
  onClose: () => void
}) => {
  return (
    <Modal size="full" isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalBody>
          <NftDetail network={network} nft={nft} onClose={onClose} />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
