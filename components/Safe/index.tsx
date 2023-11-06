import { AddIcon, EditIcon, MinusIcon } from '@chakra-ui/icons'
import {
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure
} from '@chakra-ui/react'
import assert from 'assert'
import { useEffect, useState } from 'react'
import { useAsync } from 'react-use'

import { AccountAvatar } from '~components/AccountAvatar'
import { SettingItem } from '~components/SettingItem'
import { TextLink } from '~components/TextLink'
import { ETHEREUM_MAINNET_CHAINID } from '~lib/network/evm'
import { getSafeAccount } from '~lib/safe'
import {
  IChainAccount,
  INetwork,
  ISubWallet,
  IWallet,
  SubIndex,
  accountName
} from '~lib/schema'
import { getAccountUrl } from '~lib/services/network'
import { EvmClient } from '~lib/services/provider/evm'
import { WALLET_SERVICE, useChainAccounts } from '~lib/services/wallet'
import {
  SafeOwner,
  checkAddress,
  isMultisigWallet,
  isWatchWallet
} from '~lib/wallet'

import { SafeEditModal, SafeEditType } from './SafeEditModal'

export * from './SafeConfirmTx'

export const SafeSettingsModal = ({
  isOpen,
  onClose,
  network,
  wallet,
  subWallet,
  account
}: {
  isOpen: boolean
  onClose: () => void
  network: INetwork
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
}) => {
  const [editType, setEditType] = useState<SafeEditType>('changeThreshold')
  const [editIndex, setEditIndex] = useState<number>()

  const {
    isOpen: isSafeEditOpen,
    onOpen: onSafeEditOpen,
    onClose: onSafeEditClose
  } = useDisclosure()

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
        <ModalContent my={0}>
          <ModalCloseButton />
          <ModalBody p={0}>
            {isOpen && (
              <SafeSettingsDisplay
                network={network}
                wallet={wallet}
                subWallet={subWallet}
                account={account}
                onEdit={(type, index) => {
                  setEditType(type)
                  setEditIndex(index)
                  onSafeEditOpen()
                  onClose()
                }}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <SafeEditModal
        isOpen={isSafeEditOpen}
        onClose={onSafeEditClose}
        network={network}
        wallet={wallet}
        subWallet={subWallet}
        account={account}
        type={editType}
        index={editIndex}
      />
    </>
  )
}

export const SafeSettings = ({
  network,
  wallet,
  subWallet,
  account
}: {
  network: INetwork
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
}) => {
  const [editType, setEditType] = useState<SafeEditType>('changeThreshold')
  const [editIndex, setEditIndex] = useState<number>()

  const {
    isOpen: isSafeEditOpen,
    onOpen: onSafeEditOpen,
    onClose: onSafeEditClose
  } = useDisclosure()

  return (
    <>
      <SafeSettingsDisplay
        network={network}
        wallet={wallet}
        subWallet={subWallet}
        account={account}
        onEdit={(type, index) => {
          setEditType(type)
          setEditIndex(index)
          onSafeEditOpen()
        }}
      />

      <SafeEditModal
        isOpen={isSafeEditOpen}
        onClose={onSafeEditClose}
        network={network}
        wallet={wallet}
        subWallet={subWallet}
        account={account}
        type={editType}
        index={editIndex}
      />
    </>
  )
}

const SafeSettingsDisplay = ({
  network,
  wallet,
  subWallet,
  account,
  onEdit
}: {
  network: INetwork
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
  onEdit: (type: SafeEditType, index?: number) => void
}) => {
  const safeInfo = account.info.safe || subWallet.info.safe

  const [address, setAddress] = useState<string>()
  const [owners, setOwners] = useState<SafeOwner[]>([])
  const [threshold, setThreshold] = useState<number>(0)

  useEffect(() => {
    if (!safeInfo) {
      return
    }

    setAddress(account.address)
    setOwners(safeInfo.owners)
    setThreshold(safeInfo.threshold)
  }, [account, safeInfo])

  const accounts = useChainAccounts({
    networkKind: network.kind,
    chainId: network.chainId
  })

  useAsync(async () => {
    if (!safeInfo) {
      return
    }

    const provider = await EvmClient.from(network)
    let safeAccount
    if (account.address) {
      safeAccount = await getSafeAccount(
        provider,
        account.address,
        safeInfo.isL1SafeMasterCopy
      )
    } else {
      safeAccount = await getSafeAccount(
        provider,
        {
          safeAccountConfig: {
            owners: safeInfo.owners.map((owner) => owner.address),
            threshold: safeInfo.threshold
          },
          safeDeploymentConfig: {
            saltNonce: safeInfo.saltNonce
          }
        },
        safeInfo.isL1SafeMasterCopy
      )
    }

    const _address = await safeAccount.getAddress()
    assert(
      !account.address ||
        checkAddress(network.kind, account.address) ===
          checkAddress(network.kind, _address)
    )
    if (_address !== address) {
      setAddress(_address)
    }

    const _threshold = await safeAccount.getThreshold()
    if (_threshold !== threshold) {
      setThreshold(_threshold)
    }

    const _owners = await safeAccount.getOwners()
    if (
      _owners.length !== owners.length ||
      _owners.some(
        (owner, i) =>
          checkAddress(network.kind, owner) !==
          checkAddress(network.kind, owners[i].address)
      )
    ) {
      const newOwners: SafeOwner[] = []
      for (let i = 0; i < _owners.length; i++) {
        const _owner = _owners[i]
        const oldOwner = owners.at(i)
        if (
          oldOwner &&
          checkAddress(network.kind, _owner) ===
            checkAddress(network.kind, oldOwner.address)
        ) {
          // not changed
          continue
        }

        let associated: SubIndex | undefined
        let name
        for (const account of accounts || []) {
          // find associated account
          if (
            account.address &&
            checkAddress(network.kind, account.address) ===
              checkAddress(network.kind, _owner)
          ) {
            const wallet = await WALLET_SERVICE.getWallet(account.masterId)
            const subWallet = await WALLET_SERVICE.getSubWallet({
              masterId: account.masterId,
              index: account.index
            })
            assert(wallet && subWallet)

            if (!associated || !isWatchWallet(wallet.type)) {
              associated = {
                masterId: account.masterId,
                index: account.index
              }

              name = accountName({ wallet, subWallet })

              if (!isWatchWallet(wallet.type)) {
                // prefer non-watch account
                break
              }
            }
          }
        }

        newOwners.push({
          name: oldOwner?.name || name || '',
          address: _owner,
          associated
        })
      }

      setOwners(newOwners)
    }
  }, [safeInfo])

  if (!isMultisigWallet(wallet.type) || !safeInfo) {
    return <></>
  }

  return (
    <Stack spacing={6}>
      <SettingItem
        title="Owners"
        description="Add, remove and replace or rename existing owners. Owner names are only stored locally and will never be shared with Safe or any third parties."
        setting={
          <Stack>
            {owners.map((owner, index) => {
              return (
                <Owner
                  key={owner.address}
                  network={network}
                  owner={owner}
                  isNotOnlyOne={owners.length > 1}
                  isLast={index === owners.length - 1}
                  changeOwner={() => onEdit('changeOwner', index)}
                  addOwner={() => onEdit('addOwner')}
                  removeOwner={() => onEdit('removeOwner', index)}
                />
              )
            })}
          </Stack>
        }
        titleProps={{ fontWeight: 'medium' }}
        descriptionProps={{ color: 'gray.500' }}
        spacing={4}
      />

      <SettingItem
        title="Threshold"
        description="Any transaction requires the confirmation:"
        setting={
          <HStack>
            <Text>
              {threshold} out of {owners.length} owners
            </Text>
            <IconButton
              size="xs"
              aria-label="Change threshold"
              icon={<EditIcon />}
              onClick={() => onEdit('changeThreshold')}
            />
          </HStack>
        }
        titleProps={{ fontWeight: 'medium' }}
        descriptionProps={{ color: 'gray.500' }}
        spacing={2}
      />

      <SettingItem
        title="Safe contract version"
        setting={
          <Text>
            {safeInfo.safeVersion}+
            {network.chainId === ETHEREUM_MAINNET_CHAINID ||
            safeInfo.isL1SafeMasterCopy
              ? 'L1'
              : 'L2'}
          </Text>
        }
        titleProps={{ fontWeight: 'medium' }}
        descriptionProps={{ color: 'gray.500' }}
        spacing={2}
      />

      {!!safeInfo.saltNonce && (
        <SettingItem
          title="Salt nonce"
          description="The salt nonce for calculating the address"
          setting={<Text>{safeInfo.saltNonce}</Text>}
          titleProps={{ fontWeight: 'medium' }}
          descriptionProps={{ color: 'gray.500' }}
          spacing={2}
        />
      )}
    </Stack>
  )
}

const Owner = ({
  network,
  owner,
  isNotOnlyOne,
  isLast,
  changeOwner,
  addOwner,
  removeOwner
}: {
  network: INetwork
  owner: SafeOwner
  isNotOnlyOne: boolean
  isLast: boolean
  changeOwner: () => void
  addOwner: () => void
  removeOwner: () => void
}) => {
  return (
    <HStack justify="space-between" align="center">
      <HStack align="center">
        <AccountAvatar text={owner.address} scale={0.8} />

        <Stack spacing={1}>
          <Text noOfLines={1}>{owner.name}</Text>
          <TextLink
            text={owner.address}
            name="Address"
            url={getAccountUrl(network, owner.address)}
            urlLabel="View on explorer"
            prefixChars={40}
          />
        </Stack>
      </HStack>

      <HStack>
        <IconButton
          size="xs"
          aria-label="Change owner"
          icon={<EditIcon />}
          onClick={changeOwner}
        />

        <IconButton
          size="xs"
          aria-label="Add owner"
          icon={<AddIcon />}
          visibility={isLast ? 'visible' : 'hidden'}
          onClick={addOwner}
        />

        <IconButton
          size="xs"
          aria-label="Remove owner"
          icon={<MinusIcon />}
          visibility={isNotOnlyOne ? 'visible' : 'hidden'}
          onClick={removeOwner}
        />
      </HStack>
    </HStack>
  )
}
