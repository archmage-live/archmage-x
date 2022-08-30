import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react'

import { NetworkKind } from '~lib/network'
import { INetwork, ITransaction } from '~lib/schema'
import { getTransactionInfo } from '~lib/services/transaction'
import { EvmActivityDetail } from '~pages/Popup/Activity/ActivityDetail/evm'

export const ActivityDetail = ({
  network,
  tx
}: {
  network: INetwork
  tx: ITransaction
}) => {
  switch (network.kind) {
    case NetworkKind.EVM:
      return <EvmActivityDetail network={network} tx={tx} />
  }

  return <></>
}

export const ActivityDetailModal = ({
  network,
  tx,
  isOpen,
  onClose
}: {
  network: INetwork
  tx: ITransaction
  isOpen: boolean
  onClose: () => void
}) => {
  const txInfo = getTransactionInfo(tx)

  return (
    <Modal size="full" isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{txInfo.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <ActivityDetail network={network} tx={tx} />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
