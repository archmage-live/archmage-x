import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Text,
  chakra,
  useDisclosure
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useAsyncRetry, useInterval } from 'react-use'

import { getSafeAccount } from '~lib/safe'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { EvmClient } from '~lib/services/provider/evm'
import { SafeInfo } from '~lib/wallet'

import { SafeConfirmTxModal, useSafeConfirmTxModal } from './SafeConfirmTx'

export type SafeEditType =
  | 'changeThreshold'
  | 'changeOwner'
  | 'addOwner'
  | 'removeOwner'

export const SafeEditModal = ({
  isOpen,
  onClose,
  network,
  wallet,
  subWallet,
  account,
  type,
  index
}: {
  isOpen: boolean
  onClose: () => void
  network: INetwork
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
  type: SafeEditType
  index?: number
}) => {
  const info = account.info.safe || subWallet.info.safe

  const [threshold, setThreshold] = useState(info?.threshold || 0)
  const [newOwner, setNewOwner] = useState('')

  const { setConfirmTxParams } = useSafeConfirmTxModal()

  const {
    isOpen: isSafeConfirmTxOpen,
    onOpen: onSafeConfirmTxOpen,
    onClose: onSafeConfirmTxClose
  } = useDisclosure()

  const {
    value: safe,
    loading,
    error,
    retry
  } = useAsyncRetry(async () => {
    if (!isOpen || !account.address || !info) {
      return
    }
    const provider = await EvmClient.from(network)
    return await getSafeAccount(
      provider,
      account.address,
      info.isL1SafeMasterCopy
    )
  }, [isOpen, network, account, info])

  useInterval(retry, !loading && error ? 10000 : null)

  const onNext = useCallback(async () => {
    if (!info || !safe) {
      return
    }

    let tx
    switch (type) {
      case 'changeThreshold':
        tx = await safe.createChangeThresholdTx(threshold)
        break
      case 'changeOwner':
        tx = await safe.createSwapOwnerTx({
          oldOwnerAddress: info.owners[index!].address,
          newOwnerAddress: newOwner
        })
        break
      case 'addOwner':
        tx = await safe.createAddOwnerTx({
          ownerAddress: newOwner,
          threshold
        })
        break
      case 'removeOwner':
        tx = await safe.createRemoveOwnerTx({
          ownerAddress: info.owners[index!].address,
          threshold
        })
        break
    }

    onSafeConfirmTxOpen()
    onClose()
  }, [
    info,
    safe,
    type,
    onSafeConfirmTxOpen,
    onClose,
    threshold,
    index,
    newOwner
  ])

  if (!info) {
    return <></>
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        isCentered
        motionPreset="slideInBottom"
        scrollBehavior="inside"
        size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {type === 'changeThreshold'
              ? 'Change Threshold'
              : type === 'changeOwner'
              ? 'Change Owner'
              : type === 'addOwner'
              ? 'Add Owner'
              : type === 'removeOwner' && 'Remove Owner'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {isOpen &&
              (type === 'changeThreshold' ? (
                <SafeEditChangeThreshold
                  info={info}
                  threshold={threshold}
                  setThreshold={setThreshold}
                />
              ) : type === 'changeOwner' ? (
                <SafeEditChangeOwner {...info} index={index!} />
              ) : type === 'addOwner' ? (
                <SafeEditAddOwner {...info} />
              ) : (
                type === 'removeOwner' && (
                  <SafeEditRemoveOwner {...info} index={index!} />
                )
              ))}
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={onNext}>
              Continue
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <SafeConfirmTxModal
        isOpen={isSafeConfirmTxOpen}
        onClose={onSafeConfirmTxClose}
      />
    </>
  )
}

const SafeEditChangeThreshold = ({
  info,
  threshold,
  setThreshold
}: {
  info: SafeInfo
  threshold: number
  setThreshold: (threshold: number) => void
}) => {
  return (
    <FormControl>
      <FormLabel>Threshold</FormLabel>
      <HStack>
        <Select
          size="lg"
          w={48}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}>
          {[...Array(info.owners.length).keys()].map((index) => {
            return (
              <option key={index} value={index + 1}>
                {index + 1}
              </option>
            )
          })}
        </Select>
        <Text>out of {info.owners.length} owner(s)</Text>
      </HStack>
      <FormHelperText>
        <chakra.span fontWeight="medium">
          Current threshold is {info.threshold}.
        </chakra.span>
        &nbsp;Recommend using a threshold higher than one to prevent losing
        access to the Safe account in case an owner key is lost or compromised.
      </FormHelperText>
    </FormControl>
  )
}

const SafeEditChangeOwner = ({
  owners,
  index
}: SafeInfo & {
  index: number
}) => {
  return (
    <Stack>
      <FormControl>
        <FormLabel>Change Owner</FormLabel>
        <FormHelperText>
          Review the owner you want to replace in the Safe Account, then specify
          the new owner you want to replace it with.
        </FormHelperText>
      </FormControl>
    </Stack>
  )
}

const SafeEditAddOwner = ({ threshold, owners }: SafeInfo) => {
  return <></>
}

const SafeEditRemoveOwner = ({
  threshold,
  owners,
  index
}: SafeInfo & {
  index: number
}) => {
  return <></>
}
