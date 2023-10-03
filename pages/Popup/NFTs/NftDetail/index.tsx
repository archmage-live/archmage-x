import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  chakra
} from '@chakra-ui/react'

import { NetworkKind } from '~lib/network'
import { INetwork, INft } from '~lib/schema'
import { EvmNftDetail } from '~pages/Popup/NFTs/NftDetail/evm'

export const NftDetail = ({
  network,
  nft
}: {
  network: INetwork
  nft: INft
}) => {
  switch (network.kind) {
    case NetworkKind.EVM:
      return <EvmNftDetail network={network} nft={nft} />
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
        <ModalHeader>
          <chakra.div maxW="224px" noOfLines={1}></chakra.div>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <NftDetail network={network} nft={nft} />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
