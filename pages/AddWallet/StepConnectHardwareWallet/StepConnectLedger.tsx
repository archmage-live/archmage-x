import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Select,
  Spinner,
  Stack,
  Text
} from '@chakra-ui/react'
import { stringToPath } from '@cosmjs/crypto'
import { useVirtualizer } from '@tanstack/react-virtual'
import assert from 'assert'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAsyncRetry, useInterval } from 'react-use'

import { AccountAvatar } from '~components/AccountAvatar'
import { AlertBox } from '~components/AlertBox'
import { HdPathInput } from '~components/HdPathInput'
import { formatNumber } from '~lib/formatNumber'
import {
  LEDGER_PATH_SCHEMAS,
  LedgerPathSchema,
  clearLedgerTransport,
  getLedgerEthApp
} from '~lib/hardware/ledger'
import {
  NETWORK_SCOPES,
  NetworkKind,
  getNetworkKind,
  getNetworkScope
} from '~lib/network'
import { INetwork } from '~lib/schema'
import { getNetworkInfo, useNetwork, useNetworks } from '~lib/services/network'
import { useBalance } from '~lib/services/provider'
import { shortenAddress } from '~lib/utils'
import { generatePath } from '~lib/wallet'
import {
  useAddWalletKind,
  useDerivePosition,
  useHdPath,
  useHwAccounts,
  useHwType,
  useNetworkKind
} from '~pages/AddWallet/addWallet'

export const StepConnectLedger = ({}: {}) => {
  const [connectError, setConnectError] = useState('')

  const [networkKind, setNetworkKind] = useNetworkKind()
  const [addWalletKind, setAddWalletKind] = useAddWalletKind()
  const [hdPath, setHdPath] = useHdPath()
  const [derivePosition, setDerivePosition] = useDerivePosition()
  const [hwAccounts, setHwAccounts] = useHwAccounts()

  const networksOfKind = useNetworks(networkKind)
  const [networkId, setNetworkId] = useState<number>()
  useEffect(() => {
    setNetworkId(networksOfKind?.length ? networksOfKind[0].id : undefined)
  }, [networksOfKind])
  const network = useNetwork(networkId)

  const pathSchemas = LEDGER_PATH_SCHEMAS.get(networkKind)

  const [pathSchemaIndex, setPathSchemaIndex] = useState<number>()
  const [pathSchema, setPathSchema] = useState<LedgerPathSchema>()

  useEffect(() => {
    setPathSchemaIndex(pathSchemas?.length ? 0 : undefined)
  }, [pathSchemas])

  useEffect(() => {
    if (!pathSchemas?.length || pathSchemaIndex === undefined) {
      setPathSchema(undefined)
    } else {
      setPathSchema(pathSchemas[pathSchemaIndex])
    }
  }, [pathSchemas, pathSchemaIndex])

  useEffect(() => {
    setHdPath(pathSchema ? pathSchema.pathSchema : '')
    setDerivePosition(pathSchema ? pathSchema.derivePosition : undefined)
  }, [pathSchema, setHdPath, setDerivePosition])

  const [addresses, setAddresses] = useState<string[]>([])
  const [addressCount, setAddressCount] = useState(0)

  const getAddresses = useCallback(
    async (start: number, end: number) => {
      if (!pathSchema) {
        return
      }

      const addrs = addresses.slice()
      try {
        const appEth = await getLedgerEthApp('hid')
        for (let index = start; index < end; index++) {
          if (addrs.length !== index) {
            continue
          }
          const path = generatePath(
            pathSchema.pathSchema,
            index,
            pathSchema.derivePosition
          )
          const { address } = await appEth.getAddress(path)
          addrs.push(address)
          assert(addrs.length - 1 === index)
        }
        if (addrs.length > addresses.length) {
          setAddresses(addrs)
        }
        setConnectError('')
      } catch (err: any) {
        clearLedgerTransport('hid')
        setConnectError(err.toString())
      }
    },
    [addresses, pathSchema]
  )

  useEffect(() => {
    setAddresses([])
    setAddressCount(pathSchema ? 5 : 0)
    setConnectError('')
  }, [pathSchema])

  const { retry, loading } = useAsyncRetry(async () => {
    console.log(addressCount, addresses.length)
    if (addressCount > addresses.length) {
      await getAddresses(addresses.length, addressCount)
    }
  }, [addresses, addressCount, getAddresses])

  useInterval(retry, !loading && connectError ? 2000 : null)

  const [checked, setChecked] = useState<Set<string>>(new Set())

  const onConfirm = useCallback(async () => {}, [])

  return (
    <Stack p="4" pt="16" spacing={8}>
      <Stack>
        <Text fontSize="4xl" fontWeight="bold" textAlign="center">
          Connect Accounts on Ledger
        </Text>

        <Text fontSize="lg" color="gray.500" textAlign="center">
          Select the accounts you&apos;d like to use with Archmage.
        </Text>
      </Stack>

      <Divider />

      <FormControl>
        <FormLabel>Network</FormLabel>
        <HStack spacing={8}>
          <Select
            w={48}
            value={networkKind}
            onChange={(e) => setNetworkKind(e.target.value as any)}>
            {NETWORK_SCOPES.map((scope) => {
              return (
                <option key={scope} value={getNetworkKind(scope)}>
                  {scope}
                </option>
              )
            })}
          </Select>

          <Select
            w="auto"
            placeholder={
              networksOfKind && !networksOfKind.length
                ? `No ${
                    getNetworkScope(networkKind)
                      ? `${getNetworkScope(networkKind)} `
                      : ''
                  }Network`
                : undefined
            }
            value={networkId}
            onChange={(e) => {
              setNetworkId(+e.target.value)
            }}>
            {networksOfKind?.map((net) => {
              const info = getNetworkInfo(net)
              return (
                <option key={net.id} value={net.id}>
                  {info.name}
                </option>
              )
            })}
          </Select>
        </HStack>
      </FormControl>

      {typeof pathSchemaIndex === 'number' && (
        <>
          <FormControl>
            <FormLabel>Path Schema</FormLabel>
            <HStack spacing={8}>
              <Select
                w={48}
                value={pathSchemaIndex}
                onChange={(e) => setPathSchemaIndex(+e.target.value)}>
                {pathSchemas?.map((schema, index) => {
                  return (
                    <option key={index} value={index}>
                      {schema.description}
                    </option>
                  )
                })}
              </Select>

              {pathSchema && (
                <HdPathInput
                  forcePrefixLength={stringToPath(pathSchema.pathSchema).length}
                  fixedLength
                  derivePosition={pathSchema.derivePosition}
                  value={pathSchema.pathSchema}
                />
              )}
            </HStack>
          </FormControl>

          {network && pathSchema && (
            <SelectAddresses
              network={network}
              pathSchema={pathSchema}
              addresses={addresses}
              setAddressCount={setAddressCount}
              checked={checked}
              onChecked={(addr: string, isChecked: boolean) => {
                const checkedAddrs = new Set(checked.values())
                if (isChecked) checkedAddrs.add(addr)
                else checkedAddrs.delete(addr)
                setChecked(checkedAddrs)
              }}
            />
          )}
        </>
      )}

      <AlertBox>{connectError}</AlertBox>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        disabled={!addresses.length}
        onClick={onConfirm}>
        Connect
      </Button>
    </Stack>
  )
}

const SelectAddresses = ({
  network,
  pathSchema,
  addresses,
  setAddressCount,
  checked,
  onChecked
}: {
  network: INetwork
  pathSchema: LedgerPathSchema
  addresses: string[]
  setAddressCount: (count: number) => void
  checked: Set<string>
  onChecked: (addr: string, checked: boolean) => void
}) => {
  const parentRef = useRef(null)
  const addressesVirtualizer = useVirtualizer({
    count: addresses.length + 1,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56
  })

  useEffect(() => {
    const virtualItems = addressesVirtualizer.getVirtualItems()
    if (!virtualItems.length) {
      return
    }
    const lastItem = virtualItems[virtualItems.length - 1]
    if (lastItem.index > addresses.length - 1) {
      setAddressCount(addresses.length + 5)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses, setAddressCount, addressesVirtualizer.getVirtualItems()])

  return (
    <Box
      ref={parentRef}
      maxH="282px"
      overflowY="auto"
      userSelect="none"
      borderRadius="xl"
      borderWidth="1px">
      <Box h={addressesVirtualizer.getTotalSize() + 'px'} position="relative">
        {addressesVirtualizer.getVirtualItems().map((item) => {
          if (!addresses) {
            return <Box key="empty" ref={item.measureElement}></Box>
          }

          if (item.index > addresses.length - 1) {
            return (
              <Box
                key="load"
                position="absolute"
                top={0}
                left={0}
                transform={`translateY(${item.start}px)`}
                w="full"
                h="56px"
                ref={item.measureElement}>
                <HStack h="full" justify="center" align="center">
                  <Spinner color="purple.500" />
                  <Text
                    textAlign="center"
                    fontSize="sm"
                    fontWeight="medium"
                    color="gray.500">
                    Load More...
                  </Text>
                </HStack>
              </Box>
            )
          }

          const address = addresses[item.index]
          const path = generatePath(
            pathSchema.pathSchema,
            item.index,
            pathSchema.derivePosition
          )

          return (
            <Box
              key={address}
              position="absolute"
              top={0}
              left={0}
              transform={`translateY(${item.start}px)`}
              w="full"
              h="56px"
              ref={item.measureElement}>
              <AddressItem
                network={network}
                index={item.index}
                path={path}
                address={address}
                isChecked={checked.has(address)}
                onChecked={(checked) => onChecked(address, checked)}
              />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

const AddressItem = ({
  network,
  index,
  path,
  address,
  isChecked,
  onChecked
}: {
  network: INetwork
  index: number
  path: string
  address: string
  isChecked: boolean
  onChecked: (checked: boolean) => void
}) => {
  const balance = useBalance(network, address)

  return (
    <Button
      key={address}
      variant="ghost"
      size="lg"
      w="full"
      h={16}
      px={4}
      justifyContent="start"
      onClick={() => {
        onChecked(!isChecked)
      }}>
      <Box w="full">
        <HStack w="full" spacing={4}>
          <Checkbox mb="-12px" isChecked={isChecked} pointerEvents="none" />

          <HStack flex={1} spacing={4}>
            <AccountAvatar text={address} scale={0.8} />

            <HStack flex={1} justify="space-between" align="baseline">
              <HStack align="baseline" spacing={4}>
                <Text fontSize="sm" color="gray.500">
                  {index}.
                </Text>

                <Stack>
                  <Text
                    sx={{ fontFeatureSettings: '"tnum"' }}
                    fontSize="sm"
                    color="gray.500">
                    {shortenAddress(address)}
                  </Text>

                  <Text fontSize="xs" color="gray.500" textAlign="start">
                    {formatNumber(balance?.amount)} {balance?.symbol}
                  </Text>
                </Stack>
              </HStack>

              <Text fontSize="sm" color="gray.500">
                {path}
              </Text>
            </HStack>
          </HStack>
        </HStack>
      </Box>
    </Button>
  )
}
