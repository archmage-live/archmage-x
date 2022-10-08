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
import { INetwork, IPendingTx, ITransaction } from '~lib/schema'
import { getTransactionInfo } from '~lib/services/transaction'
import { EvmActivityDetail } from '~pages/Popup/Activity/ActivityDetail/evm'

export const ActivityDetail = ({
  network,
  tx
}: {
  network: INetwork
  tx: IPendingTx | ITransaction
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
  tx: IPendingTx | ITransaction
  isOpen: boolean
  onClose: () => void
}) => {
  const txInfo = getTransactionInfo(tx)

  return (
    <Modal size="full" isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <chakra.div maxW="224px" noOfLines={1}>
            {txInfo.name}
          </chakra.div>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <ActivityDetail network={network} tx={tx} />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
