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
import { IChainAccount, INetwork, IPendingTx, ITransaction } from '~lib/schema'
import { getTransactionInfo } from '~lib/services/transaction'
import {
  EvmPendingTxInfo,
  EvmTransactionInfo,
  isEvmTransactionResponse
} from '~lib/services/transaction/evmService'

import { AptosActivityDetail } from './aptos'
import { CosmActivityDetail } from './cosm'
import { EvmActivityDetail } from './evm'
import { EvmErc4337ActivityDetail } from './evmErc4337'

export const ActivityDetail = ({
  network,
  account,
  tx
}: {
  network: INetwork
  account: IChainAccount
  tx: IPendingTx | ITransaction
}) => {
  switch (network.kind) {
    case NetworkKind.EVM: {
      const info = tx.info as EvmPendingTxInfo | EvmTransactionInfo
      if (isEvmTransactionResponse(info.tx)) {
        return <EvmActivityDetail network={network} tx={tx} />
      } else {
        return <EvmErc4337ActivityDetail network={network} tx={tx} />
      }
    }
    case NetworkKind.COSM:
      return <CosmActivityDetail network={network} account={account} tx={tx} />
    case NetworkKind.APTOS:
      return <AptosActivityDetail network={network} account={account} tx={tx} />
  }

  return <></>
}

export const ActivityDetailModal = ({
  network,
  account,
  tx,
  isOpen,
  onClose
}: {
  network: INetwork
  account: IChainAccount
  tx: IPendingTx | ITransaction
  isOpen: boolean
  onClose: () => void
}) => {
  const txInfo = getTransactionInfo(tx, network)

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
          <ActivityDetail network={network} account={account} tx={tx} />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
