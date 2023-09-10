import { Box, useColorModeValue } from '@chakra-ui/react'
import ReactJson from 'react-json-view'

export const JsonDisplay = ({ data }: { data: object }) => {
  const rjvTheme = useColorModeValue('rjv-default', 'brewer')
  const rjvBg = useColorModeValue('gray.50', 'rgb(12, 13, 14)')

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
        src={data}
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
