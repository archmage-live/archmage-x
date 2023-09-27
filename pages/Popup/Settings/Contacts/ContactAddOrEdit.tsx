import {
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
import { useEffect, useState } from 'react'

import { AlertBox } from '~components/AlertBox'
import { NetworkKindSelect, NetworkSelect } from '~components/NetworkSelect'
import { NetworkKind } from '~lib/network'
import { IContact, INetwork } from '~lib/schema'
import { useNetwork2 } from '~lib/services/network'

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
        <ModalHeader></ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <ContactAddOrEdit contact={contact} />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export const ContactAddOrEdit = ({ contact }: { contact?: IContact }) => {
  const [networkKind, setNetworkKind] = useState<NetworkKind>()
  const [network, setNetwork] = useState<INetwork>()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [memo, setMemo] = useState('')

  const [alert, setAlert] = useState('')

  const preNetwork = useNetwork2(contact?.networkKind, contact?.chainId)

  useEffect(() => {
    setNetworkKind(contact?.networkKind)
    setNetwork(preNetwork)
    setName(contact?.name || '')
    setAddress(contact?.address || '')
    setMemo(contact?.memo || '')
  }, [contact, preNetwork])

  return (
    <Stack spacing={4}>
      <NetworkKindSelect onSet={setNetworkKind} />

      <NetworkSelect networkKind={networkKind} onSet={setNetwork} />

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
        placeholder="Memo"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />

      <AlertBox>{alert}</AlertBox>
    </Stack>
  )
}
