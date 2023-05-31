import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Select,
  Spinner,
  Stack,
  Text,
  chakra
} from '@chakra-ui/react'
import { stringToPath } from '@cosmjs/crypto'
import { useVirtualizer } from '@tanstack/react-virtual'
import assert from 'assert'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAsyncRetry, useInterval } from 'react-use'
import { useWizard } from 'react-use-wizard'

import { AccountAvatar } from '~components/AccountAvatar'
import { AlertBox } from '~components/AlertBox'
import { HdPathInput } from '~components/HdPathInput'
import { formatNumber } from '~lib/formatNumber'
import {
  LEDGER_PATH_SCHEMAS,
  LedgerPathSchema,
  clearLedgerTransport,
  getLedgerAddress,
  getLedgerBtcApp,
  getLedgerCosmApp,
  getLedgerEthApp
} from '~lib/hardware/ledger'
import {
  NETWORK_SCOPES,
  NetworkKind,
  getNetworkKind,
  getNetworkScope
} from '~lib/network'
import {
  INetwork,
  formatAddressForAux,
  getAddressFromAux,
  getAddressPrefix
} from '~lib/schema'
import { getNetworkInfo, useNetwork, useNetworks } from '~lib/services/network'
import { useBalance } from '~lib/services/provider'
import { useChainAccountsAux, useWallet } from '~lib/services/wallet'
import { shortenAddress } from '~lib/utils'
import { WalletAccount, generatePath } from '~lib/wallet'
import {
  AddWalletKind,
  useAccounts,
  useAddSubWallets,
  useAddWallet,
  useAddWalletKind,
  useDerivePosition,
  useExistingWallet,
  useHdPath,
  useHdPathTemplate,
  useHwHash,
  useHwTransport,
  useNetworkKind
} from '~pages/AddWallet/addWallet'

import { NameInput } from '../NameInput'

export const StepConnectLedger = ({}: {}) => {
  const { nextStep } = useWizard()

  const [connectError, setConnectError] = useState('')

  const [networkKind, setNetworkKind] = useNetworkKind()
  const [addWalletKind, setAddWalletKind] = useAddWalletKind()
  const [, setHdPath] = useHdPath()
  const [, setHdPathTemplate] = useHdPathTemplate()
  const [, setDerivePosition] = useDerivePosition()
  const [hwTransport] = useHwTransport()
  const [hwHash, setHwHash] = useHwHash()
  const [accounts, setAccounts] = useAccounts()

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

  const [addresses, setAddresses] = useState<string[]>([])
  const [publicKeys, setPublicKeys] = useState<(string | undefined)[]>([])
  const [addressCount, setAddressCount] = useState(0)

  const getAddresses = useCallback(
    async (start: number, end: number) => {
      if (!network || !pathSchema || !hwTransport) {
        return
      }

      const addrs = addresses.slice()
      const pubKeys = publicKeys.slice()
      assert(addrs.length === pubKeys.length)
      try {
        let hwGot
        switch (networkKind) {
          case NetworkKind.BTC: {
            hwGot = await getLedgerBtcApp(pathSchema, hwTransport)
            break
          }
          case NetworkKind.EVM: {
            hwGot = await getLedgerEthApp(pathSchema, hwTransport)
            break
          }
          case NetworkKind.COSM: {
            hwGot = await getLedgerCosmApp(pathSchema, hwTransport)
            break
          }
          default:
            return
        }
        const [hwApp, hwHash] = hwGot

        setHwHash(hwHash)

        for (let index = start; index < end; index++) {
          if (addrs.length !== index) {
            continue
          }
          const path = generatePath(
            pathSchema.pathTemplate,
            index,
            pathSchema.derivePosition
          )
          const { address, publicKey } = await getLedgerAddress(
            hwApp,
            pathSchema,
            path
          )
          addrs.push(address)
          pubKeys.push(publicKey)
          assert(addrs.length - 1 === index)
        }
        if (addrs.length > addresses.length) {
          setAddresses(addrs)
          setPublicKeys(pubKeys)
        }

        setConnectError('')
      } catch (err: any) {
        if (hwTransport) {
          clearLedgerTransport(hwTransport)
        }
        setConnectError(err.toString())
      }
    },
    [
      network,
      pathSchema,
      hwTransport,
      addresses,
      publicKeys,
      networkKind,
      setHwHash
    ]
  )

  useEffect(() => {
    setAddresses([])
    setPublicKeys([])
    setAddressCount(pathSchema ? 5 : 0)
    setConnectError('')
  }, [pathSchema])

  const { retry, loading } = useAsyncRetry(async () => {
    if (addressCount > addresses.length) {
      await getAddresses(addresses.length, addressCount)
    }
  }, [addresses, addressCount, getAddresses])

  useInterval(retry, !loading && connectError ? 2000 : null)

  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (addWalletKind === AddWalletKind.CONNECT_HARDWARE) {
      if (checked.size <= 1) {
        return
      }
      const checkedAddrs = new Set(checked.values())
      let firstFound = false
      for (const addr of addresses) {
        if (checkedAddrs.has(addr)) {
          if (firstFound) {
            checkedAddrs.delete(addr)
          } else {
            firstFound = true
          }
        }
      }
      setChecked(checkedAddrs)
    }
  }, [addWalletKind, addresses, checked])

  const onClicked = useCallback(
    (addr: string, isChecked: boolean) => {
      const checkedAddrs = new Set(checked.values())
      if (isChecked) {
        if (addWalletKind === AddWalletKind.CONNECT_HARDWARE) {
          checkedAddrs.clear()
        }
        checkedAddrs.add(addr)
      } else {
        checkedAddrs.delete(addr)
      }
      setChecked(checkedAddrs)
    },
    [addWalletKind, checked]
  )

  useEffect(() => {
    const accounts: WalletAccount[] = []
    addresses.forEach((address, index) => {
      assert(formatAddressForAux(address, networkKind) === address)
      if (checked.has(address)) {
        // bypass existing addresses
        accounts.push({
          address,
          index,
          publicKey: publicKeys[index]
        })
      }
    })
    setAccounts(accounts)
  }, [addresses, publicKeys, checked, setAccounts, networkKind])

  useEffect(() => {
    if (!pathSchema) {
      setHdPath('')
      setHdPathTemplate('')
      setDerivePosition(undefined)
      return
    }
    if (addWalletKind === AddWalletKind.CONNECT_HARDWARE && accounts.length) {
      const path = generatePath(
        pathSchema.pathTemplate,
        accounts[0].index,
        pathSchema.derivePosition
      )
      setHdPath(path)
    }
    setHdPathTemplate(pathSchema.pathTemplate)
    setDerivePosition(pathSchema.derivePosition)
  }, [
    pathSchema,
    setHdPath,
    setHdPathTemplate,
    setDerivePosition,
    addWalletKind,
    accounts
  ])

  const existingWallet = useWallet(
    undefined,
    // find wallet by hash
    addWalletKind === AddWalletKind.CONNECT_HARDWARE
      ? accounts[0]?.address!
      : hwHash
  )
  const existingAccounts = useChainAccountsAux(existingWallet?.id, networkKind)
  const existingAddresses = useMemo(
    () => new Set(existingAccounts?.map(({ address }) => address)),
    [existingAccounts]
  )

  const [, setExistingWallet] = useExistingWallet()
  useEffect(() => {
    setExistingWallet(existingWallet)
  }, [existingWallet, setExistingWallet])

  const [name, setName] = useState('')
  useEffect(() => {
    setName(existingWallet ? existingWallet.name : '')
  }, [existingWallet])

  const [alert, setAlert] = useState('')

  useEffect(() => {
    setAlert('')
  }, [addWalletKind, pathSchema, checked, name])

  const addWallet = useAddWallet()
  const addSubWallets = useAddSubWallets()

  const onNext = useCallback(async () => {
    if (!existingWallet) {
      const { error } = await addWallet()
      if (error) {
        setAlert(error)
        return
      }
    } else if (addWalletKind === AddWalletKind.CONNECT_HARDWARE_GROUP) {
      const { error } = await addSubWallets()
      if (error) {
        setAlert(error)
        return
      }
    } else {
      return
    }

    await nextStep()
  }, [addSubWallets, addWallet, addWalletKind, existingWallet, nextStep])

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

      <FormControl isDisabled={loading}>
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
          <FormControl isDisabled={loading}>
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
                  forcePrefixLength={
                    stringToPath(pathSchema.pathTemplate).length
                  }
                  fixedLength
                  derivePosition={pathSchema.derivePosition}
                  value={pathSchema.pathTemplate}
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
              onChecked={onClicked}
              existingAddresses={existingAddresses}
            />
          )}

          <Checkbox
            size="lg"
            colorScheme="purple"
            isChecked={addWalletKind === AddWalletKind.CONNECT_HARDWARE}
            onChange={(e) =>
              setAddWalletKind(
                e.target.checked
                  ? AddWalletKind.CONNECT_HARDWARE
                  : AddWalletKind.CONNECT_HARDWARE_GROUP
              )
            }>
            <chakra.span color="gray.500" fontSize="xl">
              Only select one account without creating group.
            </chakra.span>
          </Checkbox>

          <NameInput
            value={name}
            onChange={setName}
            isDisabled={!!existingWallet}
          />
        </>
      )}

      <AlertBox>{connectError}</AlertBox>

      <AlertBox>{alert}</AlertBox>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        disabled={!accounts.length}
        onClick={onNext}>
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
  onChecked,
  existingAddresses
}: {
  network: INetwork
  pathSchema: LedgerPathSchema
  addresses: string[]
  setAddressCount: (count: number) => void
  checked: Set<string>
  onChecked: (addr: string, checked: boolean) => void
  existingAddresses: Set<string>
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

  const addressPrefix = getAddressPrefix(network)

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
                    Load...
                  </Text>
                </HStack>
              </Box>
            )
          }

          const address = addresses[item.index]
          const path = generatePath(
            pathSchema.pathTemplate,
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
                address={getAddressFromAux(address, network)}
                addressPrefix={addressPrefix}
                isDisabled={existingAddresses.has(address)}
                isChecked={
                  checked.has(address) || existingAddresses.has(address)
                }
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
  addressPrefix,
  isDisabled,
  isChecked,
  onChecked
}: {
  network: INetwork
  index: number
  path: string
  address: string
  addressPrefix?: string
  isDisabled: boolean
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
        if (!isDisabled) {
          onChecked(!isChecked)
        }
      }}>
      <Box w="full">
        <HStack w="full" spacing={4}>
          <Popover isLazy trigger="hover" placement="right">
            <PopoverTrigger>
              <Box onClick={(e) => e.stopPropagation()} h={4}>
                <Checkbox
                  isChecked={isChecked}
                  isDisabled={isDisabled}
                  onChange={(e) => onChecked(e.target.checked)}
                />
              </Box>
            </PopoverTrigger>
            {isDisabled && (
              <PopoverContent w="auto">
                <PopoverArrow />
                <PopoverBody fontSize="sm">
                  This account has been connected to Archmage
                </PopoverBody>
              </PopoverContent>
            )}
          </Popover>

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
                    {shortenAddress(address, { leadingChars: addressPrefix })}
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
