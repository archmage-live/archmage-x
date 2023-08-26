import { Box, useColorModeValue } from '@chakra-ui/react'
import React from 'react'
import ReactJson from 'react-json-view'

export const StarknetTxPayload = ({ payload }: { payload: any }) => {
  const rjvTheme = useColorModeValue('rjv-default', 'brewer')
  const rjvBg = useColorModeValue('gray.50', 'rgb(12, 13, 14)')

  if (!payload) {
    return <></>
  }

  return (
    <Box
      maxH="full"
      w="full"
      overflow="auto"
      borderRadius="8px"
      borderWidth="1px"
      borderColor="gray.500"
      px={4}
      py={2}
      bg={rjvBg}>
      <ReactJson
        src={payload}
        name={false}
        theme={rjvTheme}
        iconStyle="triangle"
        collapsed={3}
        enableClipboard={false}
        displayDataTypes={false}
        displayArrayKey={false}
      />
    </Box>
  )
}
