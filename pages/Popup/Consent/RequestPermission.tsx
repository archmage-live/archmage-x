import { Box, Button, HStack, Icon, Image, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { FaGlobeAmericas } from 'react-icons/fa'

import { CONSENT_SERVICE, ConsentRequest } from '~lib/services/consentService'
import { getTab } from '~lib/util'
import { WalletList } from '~pages/Popup/WalletDrawer/WalletList'
import { useSelectedNetwork } from '~pages/Popup/select'

export const RequestPermission = ({ request }: { request: ConsentRequest }) => {
  const [iconUrl, setIconUrl] = useState<string>()

  useEffect(() => {
    const effect = async () => {
      const tab = await getTab(request.origin)
      if (tab?.favIconUrl) {
        setIconUrl(tab.favIconUrl)
      }
    }

    effect()
  }, [request])

  const { selectedNetwork } = useSelectedNetwork()

  return (
    <Box w="full" h="full" overflowY="auto">
      <Stack w="full" minH="full" p={8} spacing={8}>
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

        <Stack align="center">
          <Text fontSize="3xl" fontWeight="medium">
            Connect With Archmage
          </Text>
          <Text fontSize="lg">Select the account(s) to use on this site</Text>
        </Stack>

        <Stack flex={1} align="center">
          <Stack
            w="full"
            borderWidth="1px"
            borderRadius="8px"
            px={4}
            spacing="4">
            <WalletList network={selectedNetwork} maxH="224px" />
          </Stack>

          <Text fontSize="md">Only connect with sites you trust.</Text>
        </Stack>

        <HStack justify="space-between">
          <Button
            size="lg"
            variant="outline"
            w={36}
            onClick={() => {
              CONSENT_SERVICE.processRequest(request, false).then(() => {
                window.close()
              })
            }}>
            Cancel
          </Button>
          <Button size="lg" w={36} colorScheme="purple">
            Connect
          </Button>
        </HStack>
      </Stack>
    </Box>
  )
}
