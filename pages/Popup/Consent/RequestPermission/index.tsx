import {
  Box,
  Button,
  HStack,
  Icon,
  Image,
  Stack,
  Text,
  chakra
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { FaGlobeAmericas } from 'react-icons/fa'

import { useActiveNetwork } from '~lib/active'
import { CONSENT_SERVICE, ConsentRequest } from '~lib/services/consentService'
import { WALLET_SERVICE } from '~lib/services/walletService'
import { useSiteIconUrl } from '~lib/util'
import { shortenAddress } from '~lib/utils'
import { useWalletTree } from '~pages/Popup/WalletDrawer/tree'

import { WalletList } from './WalletList'

export const RequestPermission = ({ request }: { request: ConsentRequest }) => {
  const iconUrl = useSiteIconUrl(request.origin)

  const network = useActiveNetwork()

  const { wallets, toggleOpen, checked, setChecked } = useWalletTree(network)

  const [flatChecked, setFlatChecked] = useState<number[]>()

  const [info, setInfo] = useState<any>()
  useEffect(() => {
    const effect = async () => {
      const flatChecked = Array.from(checked.keys())
      setFlatChecked(flatChecked)

      if (flatChecked.length !== 1) {
        return
      }

      const account = await WALLET_SERVICE.getChainAccount(flatChecked[0])
      if (!account) {
        return
      }
      const wallet = await WALLET_SERVICE.getWallet(account.masterId)
      const subWallet = await WALLET_SERVICE.getSubWallet({
        masterId: account.masterId,
        index: account.index
      })

      setInfo({
        name:
          wallet &&
          (subWallet?.name
            ? `${wallet.name} / ${subWallet.name}`
            : wallet.name),
        address: account?.address
      })
    }

    effect()
  }, [checked])

  const [isLoading, setIsLoading] = useState(false)

  if (!wallets) {
    return <></>
  }

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

        <Stack flex={1} align="center" spacing={8}>
          <Stack w="full" align="center">
            <Box w="full" borderWidth="1px" borderRadius="8px">
              <WalletList
                network={network}
                wallets={wallets}
                onToggleOpen={toggleOpen}
                onChecked={setChecked}
                renderItems={6}
                px={4}
              />
            </Box>

            <Text fontSize="md">Only connect with sites you trust.</Text>
          </Stack>

          <Stack align="center">
            {flatChecked?.length &&
              (flatChecked.length === 1 ? (
                <>
                  <Text fontSize="xl" noOfLines={1}>
                    Connect to&nbsp;
                    <chakra.span fontStyle="italic">{info?.name}</chakra.span>
                  </Text>
                  <Text fontSize="lg" color="gray.500">
                    {shortenAddress(info?.address)}
                  </Text>
                </>
              ) : (
                <Text fontSize="xl">
                  Connect to&nbsp;
                  <chakra.span fontStyle="italic">
                    {flatChecked.length}
                  </chakra.span>
                  &nbsp;accounts
                </Text>
              ))}
          </Stack>
        </Stack>

        <HStack justify="space-between">
          <Button
            size="lg"
            variant="outline"
            w={36}
            onClick={async () => {
              await CONSENT_SERVICE.processRequest(request, false)
              window.close()
            }}>
            Cancel
          </Button>
          <Button
            size="lg"
            w={36}
            colorScheme="purple"
            disabled={!flatChecked?.length}
            isLoading={isLoading}
            onClick={async () => {
              if (!network) {
                return
              }

              request.accountId = flatChecked!
              setIsLoading(true)
              await CONSENT_SERVICE.processRequest(request, true)
              window.close()
            }}>
            Connect
          </Button>
        </HStack>
      </Stack>
    </Box>
  )
}
