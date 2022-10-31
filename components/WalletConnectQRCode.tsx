import { RepeatIcon } from '@chakra-ui/icons'
import {
  Box,
  HStack,
  IconButton,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useColorModeValue
} from '@chakra-ui/react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import * as React from 'react'

import { CopyArea } from '~components/CopyIcon'

export const WallectConnectQRCode = ({
  url,
  refresh
}: {
  url: string
  refresh: () => void
}) => {
  const [tabIndex, setTabIndex] = useState(0)

  const qrCodeBg = useColorModeValue('white', 'black')
  const qrCodeFg = useColorModeValue('black', 'white')

  return (
    <Stack spacing={6}>
      <Tabs
        align="center"
        variant="unstyled"
        index={url ? tabIndex : 0}
        onChange={url ? setTabIndex : undefined}>
        <HStack justify="center">
          <TabList>
            <Tab _selected={{ color: 'white', bg: 'blue.500' }}>QR Code</Tab>
            <Tab _selected={{ color: 'white', bg: 'blue.500' }}>URL</Tab>
          </TabList>
          <IconButton
            aria-label="Refresh url"
            icon={<RepeatIcon />}
            onClick={refresh}
          />
        </HStack>
      </Tabs>

      <Tabs align="center" index={tabIndex}>
        <TabPanels>
          <TabPanel p={0}>
            <Box
              filter="auto"
              blur={url ? '0' : '4px'}
              transition="filter 0.2s">
              <QRCodeSVG
                value={url}
                size={200}
                bgColor={qrCodeBg}
                fgColor={qrCodeFg}
                level={'L'}
                includeMargin={false}
              />
            </Box>
          </TabPanel>
          <TabPanel p={0}>
            <CopyArea name="URL" copy={url} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  )
}
