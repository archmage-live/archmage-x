import {
  Box,
  Divider,
  HStack,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { Types } from 'aptos'
import React from 'react'
import ReactJson from 'react-json-view'

import { CopyArea } from '~components/CopyIcon'
import {
  isAptosEntryFunctionPayload,
  isAptosScriptPayload
} from '~lib/services/provider/aptos/types'
import { extractAptosIdentifier } from '~lib/services/transaction/aptosParse'
import { shortenAddress } from '~lib/utils'

export const AptosTransactionPayload = ({
  tx
}: {
  tx: Types.Transaction_UserTransaction
}) => {
  const payload = tx.payload

  const rjvTheme = useColorModeValue('rjv-default', 'brewer')
  const rjvBg = useColorModeValue('gray.50', 'rgb(12, 13, 14)')

  if (isAptosEntryFunctionPayload(payload) || isAptosScriptPayload(payload)) {
    const [moduleAddr, moduleName, funcName] = isAptosEntryFunctionPayload(
      payload
    )
      ? extractAptosIdentifier(payload.function)
      : []

    return (
      <Stack spacing={6}>
        {isAptosEntryFunctionPayload(payload) && (
          <>
            <Stack spacing={2}>
              <Text>Function</Text>
              <Stack spacing={1} color="gray.500" fontSize="md">
                <HStack justify="space-between">
                  <Text>Address:</Text>
                  <Text
                    noOfLines={3}
                    color="blue.500"
                    maxW="calc(100% - 120px)">
                    {moduleAddr}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text>Module Name:</Text>
                  <Text
                    noOfLines={2}
                    color="purple.500"
                    maxW="calc(100% - 120px)">
                    {moduleName}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text>Function Name:</Text>
                  <Text
                    noOfLines={2}
                    color="orange.500"
                    maxW="calc(100% - 120px)">
                    {funcName}
                  </Text>
                </HStack>
              </Stack>
            </Stack>

            <Divider />
          </>
        )}

        {isAptosScriptPayload(payload) && (
          <>
            <Stack spacing={2}>
              <Text>Code</Text>
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
                  src={payload.code}
                  name={false}
                  theme={rjvTheme}
                  iconStyle="triangle"
                  collapsed={3}
                  enableClipboard={false}
                  displayDataTypes={false}
                  displayArrayKey={false}
                />
              </Box>
            </Stack>

            <Divider />
          </>
        )}

        <Stack spacing={2}>
          <Text>Type Arguments</Text>
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
              src={payload.type_arguments}
              name={false}
              theme={rjvTheme}
              iconStyle="triangle"
              collapsed={3}
              enableClipboard={false}
              displayDataTypes={false}
              displayArrayKey={false}
            />
          </Box>
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Text>Arguments</Text>
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
              src={payload.arguments}
              name={false}
              theme={rjvTheme}
              iconStyle="triangle"
              collapsed={3}
              enableClipboard={false}
              displayDataTypes={false}
              displayArrayKey={false}
            />
          </Box>
        </Stack>
      </Stack>
    )
  } else {
    return (
      <Stack spacing={6}>
        <Stack spacing={2}>
          <Text>Modules</Text>
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
              src={payload.modules}
              name={false}
              theme={rjvTheme}
              iconStyle="triangle"
              collapsed={3}
              enableClipboard={false}
              displayDataTypes={false}
              displayArrayKey={false}
            />
          </Box>
        </Stack>
      </Stack>
    )
  }
}

export const AptosTransactionEvents = ({
  tx
}: {
  tx: Types.Transaction_UserTransaction
}) => {
  const rjvTheme = useColorModeValue('rjv-default', 'brewer')
  const rjvBg = useColorModeValue('gray.50', 'rgb(12, 13, 14)')

  return (
    <Stack spacing={6}>
      {tx.events.map((event, index) => {
        return (
          <React.Fragment key={index}>
            <Stack color="gray.500" fontSize="md">
              <HStack justify="space-between">
                <Text>Index:</Text>
                <Text maxW="calc(100% - 120px)">{index}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>Account Address:</Text>
                <CopyArea
                  name="Address"
                  copy={event.guid.account_address}
                  area={shortenAddress(event.guid.account_address)}
                  props={{ maxW: 'calc(100% - 120px)' }}
                />
              </HStack>
              <HStack justify="space-between">
                <Text>Creation Number:</Text>
                <Text maxW="calc(100% - 120px)">
                  {event.guid.creation_number}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text>Sequence Number:</Text>
                <Text maxW="calc(100% - 120px)">{event.sequence_number}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>Type:</Text>
                <Text noOfLines={6} maxW="calc(100% - 120px)">
                  {event.type}
                </Text>
              </HStack>
              <HStack justify="space-between" pt={2}>
                <Text>Data:</Text>
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
                    src={event.data}
                    name={false}
                    theme={rjvTheme}
                    iconStyle="triangle"
                    collapsed={3}
                    enableClipboard={false}
                    displayDataTypes={false}
                    displayArrayKey={false}
                  />
                </Box>
              </HStack>
            </Stack>
            {index < tx.events.length - 1 && <Divider />}
          </React.Fragment>
        )
      })}
    </Stack>
  )
}

export const AptosTransactionChanges = ({
  tx
}: {
  tx: Types.Transaction_UserTransaction
}) => {
  const rjvTheme = useColorModeValue('rjv-default', 'brewer')
  const rjvBg = useColorModeValue('gray.50', 'rgb(12, 13, 14)')

  return (
    <Stack spacing={6}>
      {tx.changes.map((change, index) => {
        const items = itemsForChange(change)
        return (
          <React.Fragment key={index}>
            <Stack color="gray.500" fontSize="md">
              <HStack justify="space-between">
                <Text>Index:</Text>
                <Text maxW="calc(100% - 120px)">{index}</Text>
              </HStack>

              {items.map(({ name, value, isArea, isJson, noOfLines }) => {
                return (
                  <HStack key={name} justify="space-between">
                    <Text>{name}:</Text>
                    {isArea ? (
                      <CopyArea
                        name="Address"
                        copy={value as string}
                        area={shortenAddress(value as string)}
                        props={{ maxW: 'calc(100% - 120px)' }}
                      />
                    ) : isJson ? (
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
                          src={value as object}
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
                      <Text maxW="calc(100% - 120px)" noOfLines={noOfLines}>
                        {value as string}
                      </Text>
                    )}
                  </HStack>
                )
              })}
            </Stack>
            {index < tx.changes.length - 1 && <Divider />}
          </React.Fragment>
        )
      })}
    </Stack>
  )
}

interface Item {
  name: string
  value: string | object
  isArea?: boolean
  isJson?: boolean
  noOfLines?: number
}

function itemsForChange(change: Types.WriteSetChange) {
  let items: Item[] = [
    { name: 'Type', value: change.type },
    { name: 'State Key Hash', value: change.state_key_hash }
  ]

  switch (change.type) {
    case 'delete_module': {
      const c = change as Types.WriteSetChange_DeleteModule
      items.push(
        { name: 'Address', value: c.address, isArea: true },
        { name: 'Module', value: c.module, noOfLines: 3 }
      )
      break
    }
    case 'delete_resource': {
      const c = change as Types.WriteSetChange_DeleteResource
      items.push(
        { name: 'Address', value: c.address, isArea: true },
        { name: 'Resource', value: c.resource, noOfLines: 3 }
      )
      break
    }
    case 'delete_table_item': {
      const c = change as Types.WriteSetChange_DeleteTableItem
      items.push(
        { name: 'Handle', value: c.handle, noOfLines: 3 },
        { name: 'Key', value: c.key, noOfLines: 3 }
      )
      if (c.data) {
        items.push({ name: 'Data', value: c.data, isJson: true })
      }
      break
    }
    case 'write_module': {
      const c = change as Types.WriteSetChange_WriteModule
      items.push({ name: 'Data', value: c.data, isJson: true })
      break
    }
    case 'write_resource': {
      const c = change as Types.WriteSetChange_WriteResource
      items.push({ name: 'Data', value: c.data, isJson: true })
      break
    }
    case 'write_table_item': {
      const c = change as Types.WriteSetChange_WriteTableItem
      items.push(
        { name: 'Handle', value: c.handle, noOfLines: 3 },
        { name: 'Key', value: c.key, noOfLines: 3 },
        { name: 'Value', value: c.value, noOfLines: 3 }
      )
      if (c.data) {
        items.push({ name: 'Data', value: c.data, isJson: true })
      }
      break
    }
  }

  return items
}
