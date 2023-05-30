import {
  Box,
  Button,
  Center,
  HStack,
  Icon,
  Image,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { FaAngleRight } from '@react-icons/all-files/fa/FaAngleRight'
import { FaGlobeAmericas } from '@react-icons/all-files/fa/FaGlobeAmericas'
import { ReactNode } from 'react'

import { useActiveNetwork } from '~lib/active'
import { CONSENT_SERVICE, ConsentRequest } from '~lib/services/consentService'
import {
  getNetworkInfo,
  useNetwork,
  useNetworkLogoUrl
} from '~lib/services/network'
import { useSiteIconUrl } from '~lib/tab'

export const SwitchNetwork = ({
  request,
  onComplete,
  rejectAllButton
}: {
  request: ConsentRequest
  onComplete: () => void
  rejectAllButton: ReactNode
}) => {
  const iconUrl = useSiteIconUrl(request.origin)

  const activeNetwork = useActiveNetwork()

  const network = useNetwork(request.networkId)

  const activeNetworkLogoUrl = useNetworkLogoUrl(activeNetwork)
  const networkLogoUrl = useNetworkLogoUrl(network)

  const borderColor = useColorModeValue('gray.300', 'gray.500')
  const bg = useColorModeValue('blackAlpha.100', 'gray.900')
  const dashedColor = useColorModeValue('gray.300', 'gray.500')

  return (
    <Box w="full" h="full" overflowY="auto">
      <Stack w="full" minH="full" p={8} spacing={8} justify="space-between">
        <Stack spacing={8}>
          <HStack justify="center">
            <HStack
              borderWidth="1px"
              borderRadius="16px"
              px={4}
              py={2}
              maxW="full">
              <Image
                borderRadius="full"
                boxSize="25px"
                fit="cover"
                src={iconUrl}
                fallback={<Icon as={FaGlobeAmericas} fontSize="3xl" />}
                alt="Origin Icon"
              />
              <Text noOfLines={2}>{request.origin}</Text>
            </HStack>
          </HStack>

          <Stack textAlign="center">
            <Text fontSize="2xl" fontWeight="medium">
              Allow this site to switch the active network?
            </Text>
            <Text fontSize="sm">
              It will switch the active network within Archmage.
            </Text>
          </Stack>

          <HStack px={4} py={12} spacing={0} align="start">
            <Stack w="64px">
              <Center
                w="64px"
                h="64px"
                borderRadius="50%"
                borderWidth="1px"
                borderColor={borderColor}
                bg={bg}>
                <Image
                  borderRadius="full"
                  boxSize="48px"
                  fit="cover"
                  src={activeNetworkLogoUrl}
                  alt="Network Logo"
                />
              </Center>
              <Text textAlign="center" noOfLines={2}>
                {activeNetwork && getNetworkInfo(activeNetwork).name}
              </Text>
            </Stack>

            <Center flex={1} h="64px" position="relative">
              <Center
                w="32px"
                h="32px"
                borderRadius="50%"
                bg="blue.500"
                position="absolute">
                <Icon as={FaAngleRight} fontSize="2xl" color="white" />
              </Center>
              <Box
                w="full"
                borderBottomWidth="1px"
                borderColor={dashedColor}
                borderStyle="dashed"></Box>
            </Center>

            <Stack w="64px">
              <Center
                w="64px"
                h="64px"
                borderRadius="50%"
                borderWidth="1px"
                borderColor={borderColor}
                bg={bg}>
                <Image
                  borderRadius="full"
                  boxSize="48px"
                  fit="cover"
                  src={networkLogoUrl}
                  alt="Network Logo"
                />
              </Center>
              <Text textAlign="center" noOfLines={2}>
                {network && getNetworkInfo(network).name}
              </Text>
            </Stack>
          </HStack>
        </Stack>

        <Stack spacing={8}>
          <HStack justify="space-between">
            <Button
              size="lg"
              variant="outline"
              w={40}
              onClick={async () => {
                await CONSENT_SERVICE.processRequest(request, false)
                onComplete()
              }}>
              Cancel
            </Button>
            <Button
              size="lg"
              w={40}
              colorScheme="purple"
              onClick={async () => {
                await CONSENT_SERVICE.processRequest(request, true)
                onComplete()
              }}>
              Switch Network
            </Button>
          </HStack>

          {rejectAllButton}
        </Stack>
      </Stack>
    </Box>
  )
}
