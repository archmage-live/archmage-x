import {
  Button,
  ButtonGroup,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Textarea
} from '@chakra-ui/react'
import { fromBech32 } from '@cosmjs/encoding'
import { useCallback, useEffect, useState } from 'react'

import { AlertBox } from '~components/AlertBox'
import { NetworkKindSelect, NetworkSelect } from '~components/NetworkSelect'
import { NetworkKind } from '~lib/network'
import { CosmAppChainInfo } from '~lib/network/cosm'
import {
  IContact,
  INetwork,
  MAX_ADDRESS_BOOK_MEMO_LENGTH,
  MAX_NAME_LENGTH
} from '~lib/schema'
import { CONTACT_SERVICE } from '~lib/services/contactService'
import { useNetwork2 } from '~lib/services/network'
import { checkAddress } from '~lib/wallet'

export const ContactAddOrEditModal = ({
  contact,
  isOpen,
  onClose
}: {
  contact?: IContact
  isOpen: boolean
  onClose: () => void
}) => {
  return (
    <Modal size="full" isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Address</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={8} display="flex" flexDirection="column">
          <Stack flex={1} spacing={6}>
            <Divider />
            <ContactAddOrEdit contact={contact} onClose={onClose} />
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export const ContactAddOrEdit = ({
  contact,
  onClose
}: {
  contact?: IContact
  onClose: () => void
}) => {
  const [networkKind, setNetworkKind] = useState<NetworkKind | undefined>(
    contact?.networkKind
  )
  const [network, setNetwork] = useState<INetwork>()

  const [name, setName] = useState(contact?.name || '')
  const [address, setAddress] = useState(contact?.address || '')
  const [memo, setMemo] = useState(contact?.memo || '')

  const [alert, setAlert] = useState('')

  const preNetwork = useNetwork2(contact?.networkKind, contact?.chainId)

  useEffect(() => {
    setNetwork(preNetwork)
  }, [preNetwork])

  useEffect(() => {
    setAlert('')
  }, [networkKind, network, name, address, memo])

  const onAddOrSave = useCallback(async () => {
    if (!networkKind) {
      return
    }

    const c = !contact ? ({} as IContact) : { ...contact }

    c.networkKind = networkKind
    c.chainId = network?.chainId

    c.name = name.trim()
    if (!c.name.length || c.name.length > MAX_NAME_LENGTH) {
      setAlert(
        `Name is required and can be up to ${MAX_NAME_LENGTH} characters.`
      )
      return
    }

    const addr = checkAddress(networkKind, address.trim())
    if (!addr) {
      setAlert('Invalid address')
      return
    }
    c.address = addr

    c.memo = memo.trim()
    if (c.memo.length > MAX_ADDRESS_BOOK_MEMO_LENGTH) {
      setAlert(`Memo can be up to ${MAX_ADDRESS_BOOK_MEMO_LENGTH} characters.`)
      return
    }

    if (network) {
      switch (networkKind) {
        case NetworkKind.BTC:
          // TODO: BTC address is not the same across different networks
          break
        case NetworkKind.COSM: {
          const info = network.info as CosmAppChainInfo
          if (
            fromBech32(c.address).prefix !==
            info.bech32Config.bech32PrefixAccAddr
          ) {
            setAlert(
              `Address prefix must be ${info.bech32Config.bech32PrefixAccAddr}`
            )
            return
          }
        }
      }
    }

    if (!contact) {
      await CONTACT_SERVICE.addContact(c)
    } else {
      await CONTACT_SERVICE.updateContact(c)
    }

    onClose()
  }, [contact, onClose, networkKind, network, name, address, memo])

  const onDelete = useCallback(async () => {
    if (!contact) {
      return
    }

    await CONTACT_SERVICE.deleteContact(contact.id)

    onClose()
  }, [contact, onClose])

  return (
    <Stack flex={1} h="full" justify="space-between">
      <Stack spacing={6}>
        <Stack spacing={4}>
          <NetworkKindSelect
            networkKind={networkKind}
            onSetNetworkKind={setNetworkKind}
          />

          <NetworkSelect
            networkKind={networkKind}
            network={network}
            onSetNetwork={setNetwork}
            allowAnyNetwork
          />
        </Stack>

        <Stack spacing={4}>
          <Input
            size="lg"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Textarea
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <Textarea
            placeholder="Memo (Optional)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </Stack>

        <AlertBox>{alert}</AlertBox>
      </Stack>

      <ButtonGroup size="lg">
        <Button flex={1} onClick={onClose}>
          Cancel
        </Button>
        <Button flex={1} colorScheme="purple" onClick={onAddOrSave}>
          {!contact ? 'Add' : 'Save'}
        </Button>
        {contact && (
          <Button flex={1} colorScheme="red" onClick={onDelete}>
            Delete
          </Button>
        )}
      </ButtonGroup>
    </Stack>
  )
}
