import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@chakra-ui/icons'
import {
  Button,
  Divider,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure
} from '@chakra-ui/react'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'

import { useCheckUnlocked } from '~lib/password'
import {
  CONSENT_SERVICE,
  ConsentRequest,
  ConsentType,
  useConsentRequests
} from '~lib/services/consentService'

import { AddNetwork } from './AddNetwork'
import { RequestPermission } from './RequestPermission'
import { SignMessage } from './SignMessage'
import { SignTypedData } from './SignTypedData'
import { SwitchNetwork } from './SwitchNetwork'
import { Transaction } from './Transaction'
import { WatchAsset } from './WatchAsset'

export default function Consent() {
  const navigate = useNavigate()

  const allRequests = useConsentRequests()

  useEffect(() => {
    if (!allRequests) {
      return
    }
    if (!allRequests.length) {
      navigate('/', { replace: true })
    }
  }, [navigate, allRequests])

  const requests = useFilterRequests(allRequests)

  const [index, setIndex] = useState(0)
  const request = useMemo(() => {
    if (!requests?.length) {
      setIndex(0)
      return
    }
    const i = Math.min(index, requests.length - 1)
    setIndex(i)
    return requests[i]
  }, [requests, index])

  const onComplete = useCallback(async () => {
    const requests = await CONSENT_SERVICE.getRequests()
    if (!requests.length) {
      window.close()
    }
  }, [])

  const {
    isOpen: isRejectOpen,
    onOpen: onRejectOpen,
    onClose: onRejectClose
  } = useDisclosure()

  if (!requests?.length || !request) {
    return <></>
  }

  const rejectAllButton = requests.length > 1 && (
    <HStack justify="center">
      <Button
        size="sm"
        w="auto"
        variant="ghost"
        color="gray.500"
        onClick={onRejectOpen}>
        Reject {requests.length} {consentName(request.type)}
      </Button>
    </HStack>
  )

  return (
    <Stack w="full" h="full" spacing={0} position="relative">
      {requests.length > 1 && (
        <>
          <HStack px={4} py={2} justify="space-between">
            <HStack spacing={0} w={16}>
              {index > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="xs"
                    px={1}
                    onClick={() => setIndex(0)}>
                    <ArrowLeftIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    px={1}
                    onClick={() => setIndex((index) => index - 1)}>
                    <ChevronLeftIcon fontSize="xl" />
                  </Button>
                </>
              )}
            </HStack>

            <Stack spacing={0} fontSize="sm" align="center">
              <Text fontWeight="medium">
                {index + 1} of {requests.length}
              </Text>
              <Text color="gray.500">Requests waiting to be confirmed</Text>
            </Stack>

            <HStack spacing={0} w={16} justify="end">
              {index < requests.length - 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="xs"
                    px={1}
                    onClick={() => setIndex((index) => index + 1)}>
                    <ChevronRightIcon fontSize="xl" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    px={1}
                    onClick={() => setIndex(requests.length - 1)}>
                    <ArrowRightIcon />
                  </Button>
                </>
              )}
            </HStack>
          </HStack>

          <Divider />
        </>
      )}

      <ConsentByType
        request={request}
        onComplete={onComplete}
        rejectAllButton={rejectAllButton}
      />

      {requests.length > 1 && (
        <Modal
          isOpen={isRejectOpen}
          onClose={onRejectClose}
          isCentered
          size="lg">
          <ModalOverlay />
          <ModalContent my={0}>
            <ModalHeader>Reject {requests.length} requests</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <Stack align="center" spacing={8}>
                <Text fontSize="md">
                  You are about to reject {requests.length}
                  &nbsp;{consentName(request.type)}.
                </Text>

                <HStack justify="center" spacing={12}>
                  <Button size="md" variant="outline" onClick={onRejectClose}>
                    Cancel
                  </Button>
                  <Button
                    size="md"
                    colorScheme="purple"
                    onClick={async () => {
                      await CONSENT_SERVICE.clearRequests(request.type)
                      onRejectClose()
                      await onComplete()
                    }}>
                    Reject All
                  </Button>
                </HStack>
              </Stack>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </Stack>
  )
}

const ConsentByType = ({
  request,
  onComplete,
  rejectAllButton
}: {
  request: ConsentRequest
  onComplete: () => Promise<void>
  rejectAllButton: ReactNode
}) => {
  const { isUnlocked } = useCheckUnlocked()

  switch (request.type) {
    case ConsentType.UNLOCK: {
      if (isUnlocked) {
        CONSENT_SERVICE.processRequest(request, true).finally(() => {
          window.close()
        })
      }
      return <></>
    }
    case ConsentType.REQUEST_PERMISSION:
      return (
        <RequestPermission
          request={request}
          onComplete={onComplete}
          rejectAllButton={rejectAllButton}
        />
      )
    case ConsentType.TRANSACTION:
      return (
        <Transaction
          request={request}
          onComplete={onComplete}
          rejectAllButton={rejectAllButton}
        />
      )
    case ConsentType.SIGN_MSG:
      return <SignMessage request={request} />
    case ConsentType.SIGN_TYPED_DATA:
      return <SignTypedData request={request} />
    case ConsentType.WATCH_ASSET:
      return <WatchAsset request={request} />
    case ConsentType.ADD_NETWORK:
      return (
        <AddNetwork
          request={request}
          onComplete={onComplete}
          rejectAllButton={rejectAllButton}
        />
      )
    case ConsentType.SWITCH_NETWORK:
      return (
        <SwitchNetwork
          request={request}
          onComplete={onComplete}
          rejectAllButton={rejectAllButton}
        />
      )
  }

  return <></>
}

function useFilterRequests(requests?: ConsentRequest[]) {
  return useMemo(() => {
    if (!requests?.length) {
      return
    }
    const type = requests[0].type
    return requests.filter((request) => request.type === type)
  }, [requests])
}

function consentName(type: ConsentType) {
  switch (type) {
    case ConsentType.REQUEST_PERMISSION:
      return 'connection requests'
    case ConsentType.TRANSACTION:
      return 'transactions'
    case ConsentType.SIGN_MSG:
      return 'message signing requests'
    case ConsentType.SIGN_TYPED_DATA:
      return 'typed data signing requests'
    case ConsentType.WATCH_ASSET:
      return 'requests for adding token'
    case ConsentType.ADD_NETWORK:
      return 'requests for adding network'
    case ConsentType.SWITCH_NETWORK:
      return 'requests for switching network'
  }
}
