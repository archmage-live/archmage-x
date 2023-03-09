import {
  Box,
  Divider,
  HStack,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { AminoMsg } from '@cosmjs/amino'
import { hexlify } from '@ethersproject/bytes'
import { ABCIMessageLog } from 'cosmjs-types/cosmos/base/abci/v1beta1/abci'
import { Any } from 'cosmjs-types/google/protobuf/any'
import React from 'react'
import ReactJson from 'react-json-view'

import { CopyArea } from '~components/CopyIcon'
import { CosmMsg } from '~lib/services/transaction/cosmParse'

export const CosmTransactionMessages = ({
  msgs
}: {
  msgs?: CosmMsg[] | Any[] | AminoMsg[]
}) => {
  const rjvTheme = useColorModeValue('rjv-default', 'brewer')
  const rjvBg = useColorModeValue('gray.50', 'rgb(12, 13, 14)')

  return (
    <Stack spacing={6}>
      <Stack spacing={2}>
        {msgs?.map((msg, index) => {
          const msgType =
            (msg as CosmMsg | AminoMsg).type || (msg as Any).typeUrl
          let data =
            (msg as AminoMsg).value ||
            (msg as CosmMsg).msg.value ||
            (msg as Any).value
          if (data instanceof Uint8Array) {
            data = hexlify(data)
          }

          return (
            <React.Fragment key={index}>
              <Stack color="gray.500" fontSize="md">
                {msgs.length > 1 && (
                  <HStack justify="space-between">
                    <Text>Index:</Text>
                    <Text maxW="calc(100% - 120px)">{index}</Text>
                  </HStack>
                )}
                <HStack justify="space-between">
                  <Text>Type:</Text>
                  <Text maxW="calc(100% - 120px)">{msgType}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text>Value:</Text>
                  {typeof data === 'object' ? (
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
                  ) : (
                    <CopyArea
                      name="Value"
                      copy={data.toString()}
                      area={data.toString()}
                      props={{ maxW: 'calc(100% - 120px)' }}
                    />
                  )}
                </HStack>
              </Stack>

              {index < msgs.length - 1 && <Divider />}
            </React.Fragment>
          )
        })}
      </Stack>
    </Stack>
  )
}

export const CosmTransactionEvents = ({
  events
}: {
  events?: ABCIMessageLog[]
}) => {
  return (
    <Stack spacing={6}>
      {events?.map((msgLog, index) => {
        return (
          <React.Fragment key={index}>
            <Stack color="gray.500" fontSize="md">
              <HStack justify="space-between">
                <Text>Index:</Text>
                <Text maxW="calc(100% - 120px)">{msgLog.msgIndex}</Text>
              </HStack>
              {msgLog.events.map((event, index) => {
                return (
                  <React.Fragment key={index}>
                    <HStack justify="space-between">
                      <Text>Type:</Text>
                      <Text maxW="calc(100% - 120px)">{event.type}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Attributes:</Text>
                      <Text maxW="calc(100% - 120px)">
                        {event.attributes
                          .map(({ key, value }) => `${key}=${value}`)
                          .join('&')}
                      </Text>
                    </HStack>
                  </React.Fragment>
                )
              })}
            </Stack>
          </React.Fragment>
        )
      })}
    </Stack>
  )
}
