import { RepeatIcon } from '@chakra-ui/icons'
import {
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
        index={tabIndex}
        onChange={setTabIndex}>
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
            <QRCodeSVG
              value={url}
              size={200}
              bgColor={qrCodeBg}
              fgColor={qrCodeFg}
              level={'L'}
              includeMargin={false}
            />
          </TabPanel>
          <TabPanel p={0}>
            <CopyArea name="URL" copy={url} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  )
}
