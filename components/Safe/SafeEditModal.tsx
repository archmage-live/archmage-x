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
import { useCallback, useEffect, useState } from 'react'
import { useAsync, useAsyncRetry, useInterval } from 'react-use'

import { AccountAvatar } from '~components/AccountAvatar'
import { SafeOwnerInput } from '~components/Safe/SafeOwnerInput'
import { ScanQRModal } from '~components/ScanQrModal'
import { SelectAccountModal } from '~components/SelectAccountModal'
import { TextLink } from '~components/TextLink'
import { getSafeAccount } from '~lib/safe'
import {
  CompositeAccount,
  IChainAccount,
  INetwork,
  ISubWallet,
  IWallet,
  accountName
} from '~lib/schema'
import { getAccountUrl } from '~lib/services/network'
import { EvmClient } from '~lib/services/provider/evm'
import { WALLET_SERVICE, useChainAccounts } from '~lib/services/wallet'
import { SafeInfo, SafeOwner, checkAddress } from '~lib/wallet'

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
  const [newOwner, setNewOwner] = useState<SafeOwner>({
    name: '',
    address: ''
  })

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
          newOwnerAddress: newOwner.address
        })
        break
      case 'addOwner':
        tx = await safe.createAddOwnerTx({
          ownerAddress: newOwner.address,
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

  const {
    isOpen: isSelectAccountOpen,
    onOpen: onSelectAccountOpen,
    onClose: onSelectAccountClose
  } = useDisclosure()

  const {
    isOpen: isScanAddressOpen,
    onOpen: onScanAddressOpen,
    onClose: onScanAddressClose
  } = useDisclosure()

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
                <SafeEditChangeOwner
                  network={network}
                  info={info}
                  index={index!}
                  owner={newOwner}
                  setOwner={setNewOwner}
                  onSelectAccountOpen={onSelectAccountOpen}
                  onScanAddressOpen={onScanAddressOpen}
                />
              ) : type === 'addOwner' ? (
                <SafeEditAddOwner
                  network={network}
                  info={info}
                  threshold={threshold}
                  setThreshold={setThreshold}
                  owner={newOwner}
                  setOwner={setNewOwner}
                  onSelectAccountOpen={onSelectAccountOpen}
                  onScanAddressOpen={onScanAddressOpen}
                />
              ) : (
                type === 'removeOwner' && (
                  <SafeEditRemoveOwner
                    network={network}
                    info={info}
                    threshold={threshold}
                    setThreshold={setThreshold}
                    index={index!}
                  />
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

      <SafeSelectOwnerModal
        network={network}
        owner={newOwner}
        setOwner={setNewOwner}
        isSelectAccountOpen={isSelectAccountOpen}
        onSelectAccountClose={onSelectAccountClose}
        isScanAddressOpen={isScanAddressOpen}
        onScanAddressClose={onScanAddressClose}
      />

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
  network,
  info,
  index,
  owner,
  setOwner,
  onSelectAccountOpen,
  onScanAddressOpen
}: {
  network: INetwork
  info: SafeInfo
  index: number
  owner: SafeOwner
  setOwner: (owner: SafeOwner) => void
  onSelectAccountOpen: () => void
  onScanAddressOpen: () => void
}) => {
  const oldOwner = info.owners[index]

  return (
    <Stack spacing={4}>
      <FormControl>
        <FormHelperText>
          Review the owner you want to replace in the Safe Account, then specify
          the new owner you want to replace it with.
        </FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel>Current owner</FormLabel>
        <HStack align="center">
          <AccountAvatar text={oldOwner.address} scale={0.8} />

          <Stack spacing={1}>
            <Text noOfLines={1}>{oldOwner.name}</Text>
            <TextLink
              text={oldOwner.address}
              name="Address"
              url={getAccountUrl(network, oldOwner.address)}
              urlLabel="View on explorer"
              prefixChars={40}
            />
          </Stack>
        </HStack>
      </FormControl>

      <FormControl>
        <FormLabel>New owner</FormLabel>
        <SafeOwnerInput
          name={owner.name}
          setName={(name) => setOwner({ ...owner, name })}
          address={owner.address}
          setAddress={(address) => setOwner({ ...owner, address })}
          onScanAddressOpen={onScanAddressOpen}
          onSelectAccountOpen={onSelectAccountOpen}
          networkKind={network.kind}
        />
      </FormControl>
    </Stack>
  )
}

const SafeEditAddOwner = ({
  network,
  info,
  threshold,
  setThreshold,
  owner,
  setOwner,
  onSelectAccountOpen,
  onScanAddressOpen
}: {
  network: INetwork
  info: SafeInfo
  threshold: number
  setThreshold: (threshold: number) => void
  owner: SafeOwner
  setOwner: (owner: SafeOwner) => void
  onSelectAccountOpen: () => void
  onScanAddressOpen: () => void
}) => {
  return (
    <Stack spacing={4}>
      <FormControl>
        <FormLabel>New owner</FormLabel>
        <SafeOwnerInput
          name={owner.name}
          setName={(name) => setOwner({ ...owner, name })}
          address={owner.address}
          setAddress={(address) => setOwner({ ...owner, address })}
          onScanAddressOpen={onScanAddressOpen}
          onSelectAccountOpen={onSelectAccountOpen}
          networkKind={network.kind}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Threshold</FormLabel>
        <HStack>
          <Select
            size="lg"
            w={48}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}>
            {[...Array(info.owners.length + 1).keys()].map((index) => {
              return (
                <option key={index} value={index + 1}>
                  {index + 1}
                </option>
              )
            })}
          </Select>
          <Text>out of {info.owners.length + 1} owner(s)</Text>
        </HStack>
        <FormHelperText>
          <chakra.span fontWeight="medium">
            Current threshold is {info.threshold}.
          </chakra.span>
        </FormHelperText>
      </FormControl>
    </Stack>
  )
}

const SafeEditRemoveOwner = ({
  network,
  info,
  threshold,
  setThreshold,
  index
}: {
  network: INetwork
  info: SafeInfo
  threshold: number
  setThreshold: (threshold: number) => void
  index: number
}) => {
  useEffect(() => {
    if (threshold > info.owners.length - 1) {
      setThreshold(info.owners.length - 1)
    }
  }, [info, threshold, setThreshold])

  const oldOwner = info.owners[index]

  return (
    <Stack spacing={4}>
      <FormControl>
        <FormLabel>Remove owner</FormLabel>
        <HStack align="center">
          <AccountAvatar text={oldOwner.address} scale={0.8} />

          <Stack spacing={1}>
            <Text noOfLines={1}>{oldOwner.name}</Text>
            <TextLink
              text={oldOwner.address}
              name="Address"
              url={getAccountUrl(network, oldOwner.address)}
              urlLabel="View on explorer"
              prefixChars={40}
            />
          </Stack>
        </HStack>
        <FormHelperText>
          Review the owner you want to remove from the active Safe Account.
        </FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel>Threshold</FormLabel>
        <HStack>
          <Select
            size="lg"
            w={48}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}>
            {[...Array(info.owners.length - 1).keys()].map((index) => {
              return (
                <option key={index} value={index + 1}>
                  {index + 1}
                </option>
              )
            })}
          </Select>
          <Text>out of {info.owners.length - 1} owner(s)</Text>
        </HStack>
        <FormHelperText>
          <chakra.span fontWeight="medium">
            Current threshold is {info.threshold}.
          </chakra.span>
        </FormHelperText>
      </FormControl>
    </Stack>
  )
}

const SafeSelectOwnerModal = ({
  network,
  owner,
  setOwner,
  isSelectAccountOpen,
  onSelectAccountClose,
  isScanAddressOpen,
  onScanAddressClose
}: {
  network: INetwork
  owner: SafeOwner
  setOwner: (owner: SafeOwner) => void
  isSelectAccountOpen: boolean
  onSelectAccountClose: () => void
  isScanAddressOpen: boolean
  onScanAddressClose: () => void
}) => {
  const [selectedAccount, setSelectedAccount] = useState<CompositeAccount>()

  const allAccounts = useChainAccounts({
    networkKind: network.kind,
    chainId: network.chainId
  })

  const onSelectAccount = useCallback(
    async (account: CompositeAccount) => {
      setOwner({
        name: owner.name.trim() ? owner.name : accountName(account),
        address: account.account.address!
      })
    },
    [owner, setOwner]
  )

  const onScanAddress = useCallback(
    async (text: string) => {
      const address = checkAddress(network.kind, text)
      if (!address) {
        return
      }
      setOwner({
        ...owner,
        address
      })
    },
    [network, owner, setOwner]
  )

  useAsync(async () => {
    if (!isSelectAccountOpen) {
      setSelectedAccount(undefined)
      return
    }

    const address = checkAddress(network.kind, owner.address)
    const account = allAccounts?.find((a) => a.address === address)
    let wallet, subWallet
    if (account) {
      wallet = await WALLET_SERVICE.getWallet(account.masterId)
      subWallet = await WALLET_SERVICE.getSubWallet({
        masterId: account.masterId,
        index: account.index
      })
    }

    setSelectedAccount(
      wallet && subWallet && account
        ? {
            wallet,
            subWallet,
            account
          }
        : undefined
    )
  }, [allAccounts, network, owner, isSelectAccountOpen])

  return (
    <>
      <ScanQRModal
        isOpen={isScanAddressOpen}
        onClose={onScanAddressClose}
        onScan={onScanAddress}
      />

      <SelectAccountModal
        network={network}
        account={selectedAccount}
        setAccount={onSelectAccount}
        isOpen={isSelectAccountOpen}
        onClose={onSelectAccountClose}
      />
    </>
  )
}
