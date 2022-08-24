import { InfoIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  Divider,
  HStack,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  chakra,
  useColorModeValue
} from '@chakra-ui/react'
import { BigNumber } from '@ethersproject/bignumber'
import { useScroll } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import HashLoader from 'react-spinners/HashLoader'

import { AlertBox } from '~components/AlertBox'
import { useColor } from '~hooks/useColor'
import { IChainAccount, IDerivedWallet, INetwork, IWallet } from '~lib/schema'
import {
  CONSENT_SERVICE,
  ConsentRequest,
  TransactionPayload
} from '~lib/services/consentService'
import { NetworkInfo } from '~lib/services/network'
import {
  EvmPopulatedParams,
  EvmTransactionParams
} from '~lib/services/provider/evm/permissioned'
import { shortenAddress } from '~lib/utils'

import { FromTo } from './FromTo'

export const EvmTransaction = ({
  origin,
  request,
  network,
  networkInfo,
  wallet,
  subWallet,
  account
}: {
  origin: string
  request: ConsentRequest
  network: INetwork
  networkInfo: NetworkInfo
  wallet: IWallet
  subWallet: IDerivedWallet
  account: IChainAccount
}) => {
  const payload = request.payload as TransactionPayload
  const txParams = payload.txParams as EvmTransactionParams
  const populated = payload.populatedParams as EvmPopulatedParams
  useEffect(() => {
    console.log(payload)
  }, [request])

  const [nonce, setNonce] = useState(BigNumber.from(txParams.nonce!).toNumber())

  const bg = useColorModeValue('purple.50', 'gray.800')
  const bannerBg = useColorModeValue('white', 'black')

  const scrollRef = useRef(null)
  const anchorRef = useRef(null)
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: anchorRef,
    offset: ['start start', 'end end']
  })
  const [tabsHeaderSx, setTabsHeaderSx] = useState<any>()
  useEffect(() => {
    return scrollYProgress.onChange((progress) => {
      setTabsHeaderSx(
        progress <= 0 ? { position: 'sticky', top: 0 } : undefined
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [spinning, setSpinning] = useState(false)
  const spinnerColor = useColor('purple.500', 'purple.500')

  const Details = () => {
    return (
      <Stack spacing={16}>
        <Stack spacing={8}>
          <Stack spacing={2}>
            <HStack justify="space-between">
              <Text>
                <chakra.span fontWeight="bold">Gas</chakra.span>
                &nbsp;
                <chakra.span fontSize="md" fontStyle="italic">
                  (estimated)
                </chakra.span>
                &nbsp;
                <Tooltip
                  label={
                    <Stack>
                      <Text>
                        Gas fee is paid to miners/validators who process
                        transactions on the Ethereum network. Archmage does not
                        profit from gas fees.
                      </Text>
                      <Text>
                        Gas fee is set by the network and fluctuate based on
                        network traffic and transaction complexity.
                      </Text>
                    </Stack>
                  }>
                  <InfoIcon verticalAlign="baseline" />
                </Tooltip>
              </Text>

              <Stack align="end" spacing={0}>
                <Text fontWeight="bold">0.01 ETH</Text>
                <Text>$3.78</Text>
              </Stack>
            </HStack>

            <HStack justify="space-between">
              <Text color="green.500" fontSize="sm" fontWeight="medium">
                Likely in {'< 30'} seconds
              </Text>

              <Text color="gray.500">Max: 0.03 ETH</Text>
            </HStack>
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <HStack justify="space-between">
              <Text fontWeight="bold">Total</Text>

              <Stack align="end" spacing={0}>
                <Text fontWeight="bold">0.02 ETH</Text>
                <Text>$3.88</Text>
              </Stack>
            </HStack>

            <HStack justify="space-between">
              <Text color="gray.500" fontSize="sm">
                Amount + Gas Fee
              </Text>

              <Text color="gray.500">Max: 0.04 ETH</Text>
            </HStack>
          </Stack>
        </Stack>

        <HStack justify="space-between">
          <Text>Nonce</Text>

          <NumberInput
            min={0}
            step={1}
            keepWithinRange
            precision={0}
            value={nonce}
            onChange={(_, val) => setNonce(val)}>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </HStack>
      </Stack>
    )
  }

  const Data = () => {
    return <></>
  }

  const Hex = () => {
    return <></>
  }

  return (
    <Stack w="full" h="full" spacing={0} position="relative">
      <Stack>
        <Center pt={4} px={6}>
          <Box px={2} py={1} borderRadius="8px" borderWidth="1px">
            <Text noOfLines={1} display="block" fontSize="sm">
              {networkInfo.name}
            </Text>
          </Box>
        </Center>

        <Divider />

        <Box px={6}>
          <FromTo
            subWallet={subWallet}
            from={txParams.from!}
            to={txParams.to || ''}
          />
        </Box>

        {true && (
          <>
            <Divider />

            <Box px={6} py={2}>
              <AlertBox level="info">
                New address detected! Click here to add to your address book.
              </AlertBox>
            </Box>

            <Divider />
          </>
        )}
      </Stack>

      <Box ref={scrollRef} overflowY="auto" position="relative" pb={6}>
        <Box w="full" bg={bannerBg}>
          <Stack px={6} py={4}>
            <Text>{origin}</Text>

            <HStack px={2} py={1} borderRadius="4px" borderWidth="1px">
              <Text fontSize="md" color="blue.500">
                {shortenAddress(txParams.to)}
              </Text>
            </HStack>
          </Stack>
          <Divider />
        </Box>

        <Box ref={anchorRef} w="full" bg={bg} zIndex={1} sx={tabsHeaderSx}>
          <Tabs w="full" px={6}>
            <TabList>
              <Tab>DETAILS</Tab>
              <Tab>DATA</Tab>
              <Tab>HEX</Tab>
            </TabList>
          </Tabs>
        </Box>

        <Stack w="full" px={6} pt={6} spacing={8}>
          <Tabs>
            <TabPanels>
              <TabPanel p={0}>
                <Details />
              </TabPanel>
              <TabPanel p={0}>
                <Data />
              </TabPanel>
              <TabPanel p={0}>
                <Hex />
              </TabPanel>
            </TabPanels>
          </Tabs>

          <Divider />

          <AlertBox level="error">
            You do not have enough ETH in your account to pay for transaction
            fees on Ethereum Mainnet network. Buy ETH or deposit from another
            account.
          </AlertBox>

          <HStack justify="center" spacing={12}>
            <Button
              size="lg"
              w={36}
              variant="outline"
              onClick={async () => {
                await CONSENT_SERVICE.processRequest(request, false)
                window.close()
              }}>
              Reject
            </Button>
            <Button
              size="lg"
              w={36}
              colorScheme="purple"
              onClick={async () => {
                setSpinning(true)
                await CONSENT_SERVICE.processRequest(request, true)
                window.close()
              }}>
              Confirm
            </Button>
          </HStack>
        </Stack>
      </Box>

      {spinning && (
        <Center
          position="absolute"
          w="full"
          h="full"
          bg="blackAlpha.600"
          zIndex={1}>
          <HashLoader color={spinnerColor.toHexString()} speedMultiplier={3} />
        </Center>
      )}
    </Stack>
  )
}
