import {
  Box,
  Center,
  Divider,
  HStack,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { StdSignDoc } from '@cosmjs/amino'
import { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { ReactNode, useCallback, useState } from 'react'
import * as React from 'react'

import { SpinningOverlay } from '~components/SpinningOverlay'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { ConsentRequest } from '~lib/services/consentService'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { NetworkInfo } from '~lib/services/network'
import { formatTxPayload } from '~lib/services/provider'
import { useCosmTransaction } from '~lib/services/provider/cosm/hooks'
import { Balance } from '~lib/services/token'
import { useCosmTxInfo } from '~lib/services/transaction/cosmService'

import {
  CosmTransactionEvents,
  CosmTransactionMessages
} from './CosmTransactionData'
import { useTabsHeaderScroll } from './helpers'

export const CosmTransaction = ({
  origin,
  request,
  network,
  networkInfo,
  wallet,
  subWallet,
  account,
  balance,
  suffix,
  onComplete
}: {
  origin?: string
  request: ConsentRequest
  network: INetwork
  networkInfo: NetworkInfo
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
  balance?: Balance
  suffix?: ReactNode
  onComplete: () => void
}) => {
  const payload = formatTxPayload(network, request.payload)
  const { txParams: signDoc } = payload as {
    txParams: SignDoc | StdSignDoc
  }

  const [editGasPrice, setEditGasPrice] = useState(false)
  const [editGasLimit, setEditGasLimit] = useState(false)

  const txResult = useCosmTransaction(network, account, signDoc)

  const txInfo = useCosmTxInfo(
    network,
    account,
    signDoc,
    txResult?.tx,
    txResult?.logs
  )

  const bg = useColorModeValue('purple.50', 'gray.800')
  const bannerBg = useColorModeValue('white', 'black')

  const { scrollRef, anchorRef, tabsHeaderSx } = useTabsHeaderScroll()

  const [tabIndex, setTabIndex] = useState(0)

  const [spinning, setSpinning] = useState(false)

  const price = useCryptoComparePrice(networkInfo.currencySymbol)

  const onConfirm = useCallback(async () => {}, [])

  return (
    <>
      <Stack>
        <Center pt={2} px={6}>
          <Box px={2} py={1} borderRadius="8px" borderWidth="1px">
            <Text noOfLines={1} display="block" fontSize="sm">
              {networkInfo.name}
            </Text>
          </Box>
        </Center>

        <Divider />
      </Stack>

      <Box ref={scrollRef} overflowY="auto" position="relative" pb={6}>
        <Box w="full" bg={bannerBg}>
          <Stack px={6} py={6} spacing={4}>
            {origin && <Text>{origin}</Text>}

            <HStack minH="30px"></HStack>
          </Stack>
        </Box>
      </Box>

      <Box ref={anchorRef} w="full" bg={bg} zIndex={1} sx={tabsHeaderSx}>
        <Tabs w="full" px={6} index={tabIndex} onChange={setTabIndex}>
          <TabList>
            <Tab>DETAILS</Tab>
            <Tab>MESSAGES</Tab>
            <Tab>EVENTS</Tab>
          </TabList>
        </Tabs>
      </Box>

      <Stack w="full" px={6} pt={6} spacing={8}>
        <Tabs index={tabIndex}>
          <TabPanels>
            <TabPanel p={0}></TabPanel>
            <TabPanel p={0}>
              <CosmTransactionMessages msgs={txInfo?.msgs} />
            </TabPanel>
            <TabPanel p={0}>
              <CosmTransactionEvents events={txResult?.logs} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>

      <SpinningOverlay loading={spinning} />
    </>
  )
}
