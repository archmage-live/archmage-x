import {
  Button,
  HStack,
  Image,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import walletConnectLogo from 'data-base64:~assets/thirdparty/walletconnect.svg'
import web3authLogoDark from 'data-base64:~assets/thirdparty/web3auth-logo-Dark.svg'
import web3authLogoLight from 'data-base64:~assets/thirdparty/web3auth-logo.svg'
import { useEffect } from 'react'
import { useWizard } from 'react-use-wizard'

import { AddWalletKind, useAddWalletKind, useClear } from './addWallet'

export const StepAddWalletSelect = () => {
  const { nextStep } = useWizard()
  const [, setAddWalletKind] = useAddWalletKind()

  const clear = useClear()
  useEffect(clear, [clear])

  const web3authLogo = useColorModeValue(web3authLogoLight, web3authLogoDark)

  const tabBottomColor = useColorModeValue('white', 'gray.900')

  return (
    <Stack p="4" pt="16">
      <HStack justify="center">
        <Text fontSize="4xl" fontWeight="bold">
          Archmage
        </Text>
      </HStack>
      <HStack justify="center">
        <Text fontSize="lg" fontWeight="bold" color="gray.500">
          Programmable Web3 wallet
        </Text>
      </HStack>

      <Tabs isFitted variant="enclosed" colorScheme="purple">
        <TabList my="8">
          <Tab
            fontSize="lg"
            fontWeight="semibold"
            sx={{
              '&[aria-selected=true]': { borderBottomColor: tabBottomColor }
            }}>
            Regular
          </Tab>
          <Tab
            fontSize="lg"
            fontWeight="semibold"
            sx={{
              '&[aria-selected=true]': { borderBottomColor: tabBottomColor }
            }}>
            Keyless
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel p="0">
            <Stack spacing="4">
              <Button
                w="full"
                h="14"
                size="lg"
                variant="outline"
                borderRadius="8px"
                onClick={() => {
                  setAddWalletKind(AddWalletKind.NEW_HD)
                  nextStep().then()
                }}>
                Create HD wallet
              </Button>
              <Button
                w="full"
                h="14"
                size="lg"
                variant="outline"
                borderRadius="8px"
                onClick={() => {
                  setAddWalletKind(AddWalletKind.IMPORT_HD)
                  nextStep().then()
                }}>
                Import existing wallet
              </Button>
              <Button
                w="full"
                h="14"
                size="lg"
                variant="outline"
                borderRadius="8px"
                onClick={() => {
                  setAddWalletKind(AddWalletKind.CONNECT_HARDWARE_GROUP)
                  nextStep().then()
                }}>
                Connect hardware wallet
              </Button>
              <Button
                w="full"
                h="14"
                size="lg"
                variant="outline"
                borderRadius="8px"
                onClick={() => {
                  setAddWalletKind(AddWalletKind.WALLET_CONNECT)
                  nextStep().then()
                }}>
                <HStack>
                  <Text>Connect with WallectConnect</Text>
                  <Image
                    w={8}
                    fit="cover"
                    src={walletConnectLogo}
                    alt="WallectConnect Logo"
                  />
                </HStack>
              </Button>
            </Stack>

            <Stack pt="8" spacing="0" align="center">
              <Text color="gray.500">
                All sensitive information is stored only on your device.
              </Text>
              {/*<Text color="gray.500">*/}
              {/*  This process will never require an internet connection.*/}
              {/*</Text>*/}
            </Stack>
          </TabPanel>

          <TabPanel p="0">
            <Stack spacing={4}>
              <Button
                w="full"
                h="14"
                size="lg"
                variant="outline"
                borderRadius="8px"
                onClick={() => {
                  setAddWalletKind(AddWalletKind.KEYLESS)
                  nextStep().then()
                }}>
                <HStack spacing={4}>
                  <Text>Onboard with</Text>
                  <Image
                    w={32}
                    fit="cover"
                    src={web3authLogo}
                    alt="web3auth Logo"
                  />
                </HStack>
              </Button>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  )
}
