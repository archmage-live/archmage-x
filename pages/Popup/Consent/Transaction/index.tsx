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
import Decimal from 'decimal.js'
import * as React from 'react'
import { useMemo, useState } from 'react'

import { NetworkKind } from '~lib/network'
import {
  CONSENT_SERVICE,
  ConsentRequest,
  ConsentType
} from '~lib/services/consentService'
import { getNetworkInfo, useNetwork } from '~lib/services/network'
import { useBalance } from '~lib/services/provider'
import {
  useChainAccount,
  useSubWalletByIndex,
  useWallet
} from '~lib/services/walletService'

import { EvmTransaction } from './EvmTransaction'

export const Transaction = ({
  requests,
  onComplete
}: {
  requests: ConsentRequest[]
  onComplete: () => void
}) => {
  const [index, setIndex] = useState(0)
  const request = useMemo(() => {
    const i = Math.min(index, requests.length - 1)
    setIndex(i)
    return requests[i]
  }, [requests, index])

  const network = useNetwork(request.networkId)
  const networkInfo = network && getNetworkInfo(network)
  const account = useChainAccount(request.accountId as number)
  const wallet = useWallet(account?.masterId)
  const subWallet = useSubWalletByIndex(account?.masterId, account?.index)
  const balance = useBalance(network, account)

  const {
    isOpen: isRejectOpen,
    onOpen: onRejectOpen,
    onClose: onRejectClose
  } = useDisclosure()

  if (
    !request ||
    !network ||
    !networkInfo ||
    !account ||
    !wallet ||
    !subWallet
  ) {
    return <></>
  }

  switch (network.kind) {
    case NetworkKind.EVM:
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

          <EvmTransaction
            origin={request.origin}
            request={request}
            network={network}
            networkInfo={networkInfo}
            wallet={wallet}
            subWallet={subWallet}
            account={account}
            balance={balance}
            onComplete={onComplete}
            suffix={
              requests.length > 1 && (
                <HStack justify="center">
                  <Button
                    size="sm"
                    maxW={48}
                    variant="ghost"
                    color="gray.500"
                    onClick={onRejectOpen}>
                    Reject {requests.length} requests
                  </Button>
                </HStack>
              )
            }
          />

          {requests.length > 1 && (
            <Modal
              isOpen={isRejectOpen}
              onClose={onRejectClose}
              isCentered
              size="lg">
              <ModalOverlay />
              <ModalContent my={0}>
                <ModalHeader>Reject {requests.length} transactions</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                  <Stack align="center" spacing={8}>
                    <Text fontSize="md">
                      You are about to reject {requests.length} transactions.
                    </Text>

                    <HStack justify="center" spacing={12}>
                      <Button
                        size="md"
                        variant="outline"
                        onClick={onRejectClose}>
                        Cancel
                      </Button>
                      <Button
                        size="md"
                        colorScheme="purple"
                        onClick={async () => {
                          await CONSENT_SERVICE.clearRequests(
                            ConsentType.TRANSACTION
                          )
                          onRejectClose()
                          onComplete()
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

  return <></>
}
