import {
  AddIcon,
  MinusIcon,
  TriangleDownIcon,
  TriangleUpIcon
} from '@chakra-ui/icons'
import {
  Button,
  Center,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Stack,
  Switch,
  Text
} from '@chakra-ui/react'
import Decimal from 'decimal.js'
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import * as React from 'react'
import { useAsyncRetry, useDebounce, useInterval } from 'react-use'
// @ts-ignore
import stableHash from 'stable-hash'

import { AlertBox } from '~components/AlertBox'
import { ChainId } from '~lib/schema'

type TestStatus = {
  loading?: boolean
  available?: boolean
  latency?: number
  height?: number
}

function getScore(status?: TestStatus) {
  const { available, latency, height } = status || {}
  return [+!!status, +!!available, height || 0, -(latency || 0)]
}

function compareScore(aStatus?: TestStatus, bStatus?: TestStatus) {
  const a = getScore(aStatus)
  const b = getScore(bStatus)
  for (let i = 0; i < a.length; ++i) {
    const as = a[i]
    const bs = b[i]
    if (as === bs) {
      continue
    }
    return bs - as
  }
  return 0
}

export const RpcUrlInputGroup = ({
  urls,
  setUrls,
  noAdd,
  noEdit,
  testUrl,
  chainId,
  getChainId,
  checkUrls,
  allowInvalidRpcUrl,
  setAllowInvalidRpcUrl,
  setLoading,
  onSaveUrls,
  isSaveDisabled,
  isUrlsChanged
}: {
  urls: string[]
  setUrls: (urls: string[]) => void
  noAdd?: boolean
  noEdit?: boolean
  testUrl: (url: string) => Promise<number>
  chainId?: ChainId
  getChainId?: (url: string) => Promise<ChainId>
  checkUrls?: MutableRefObject<
    (() => Promise<string[] | undefined>) | undefined
  >
  allowInvalidRpcUrl?: boolean
  setAllowInvalidRpcUrl?: (value: boolean) => void
  setLoading?: (loading: boolean) => void
  onSaveUrls?: () => Promise<void>
  isSaveDisabled?: boolean
  isUrlsChanged?: boolean
}) => {
  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [urls])

  const [isTestRpcUrls, setIsTestRpcUrls] = useState(false)
  const [isSortRpcUrls, setIsSortRpcUrls] = useState(false)
  useEffect(() => {
    if (!isTestRpcUrls) {
      setIsSortRpcUrls(false)
    }
  }, [isTestRpcUrls])

  const [showInvalidRpcUrlCheckbox, setShowInvalidRpcUrlCheckbox] =
    useState(false)
  useEffect(() => {
    setShowInvalidRpcUrlCheckbox(false)
    setAllowInvalidRpcUrl?.(false)
  }, [urls, setAllowInvalidRpcUrl])

  const _checkUrls = useCallback(async () => {
    const checkedRpcUrls = urls.map(checkUrl) as string[]
    if (checkedRpcUrls.some((url) => !url)) {
      setAlert('Invalid RPC url(s)')
      return
    }
    if (new Set(checkedRpcUrls).size !== checkedRpcUrls.length) {
      setAlert('Duplicate RPC url(s)')
      return
    }

    setLoading?.(true)

    try {
      const networkChainId = await getChainId?.(checkedRpcUrls[0])
      if (chainId !== undefined && chainId !== networkChainId) {
        setAlert(`Mismatched chain ID ${networkChainId} gotten from RPC server`)
        return
      }
    } catch (err) {
      if (urls.length > 1) {
        setAlert(
          'The first RPC url will be actually used, but the server is unavailable'
        )
      } else {
        setAlert('RPC server is unavailable')
      }

      setShowInvalidRpcUrlCheckbox(true)

      if (!allowInvalidRpcUrl) {
        return
      }
    }

    return checkedRpcUrls
  }, [urls, chainId, getChainId, setLoading, allowInvalidRpcUrl])

  useEffect(() => {
    if (checkUrls) {
      checkUrls.current = _checkUrls
    }
  }, [checkUrls, _checkUrls])

  const [saveColorScheme, setSaveColorScheme] = useState('gray')
  useDebounce(
    () => {
      setSaveColorScheme(isUrlsChanged ? 'purple' : 'gray')
    },
    200,
    [isUrlsChanged]
  )

  return (
    <Stack spacing={6}>
      <Stack>
        <HStack spacing={8}>
          <Text fontWeight="medium">RPC Url(s)</Text>

          <FormControl as={HStack} w="auto">
            <Switch
              size="md"
              colorScheme="purple"
              isChecked={isTestRpcUrls}
              onChange={(e) => setIsTestRpcUrls(e.target.checked)}
            />

            <FormLabel fontSize="sm">Check Availability</FormLabel>
          </FormControl>

          {isTestRpcUrls && urls.length > 1 && (
            <FormControl as={HStack} w="auto">
              <Switch
                size="md"
                colorScheme="purple"
                isChecked={isSortRpcUrls}
                onChange={(e) => setIsSortRpcUrls(e.target.checked)}
              />

              <FormLabel fontSize="sm">Sort by Availability</FormLabel>
            </FormControl>
          )}
        </HStack>

        <UrlInputGroup
          urls={urls}
          setUrls={setUrls}
          noAdd={noAdd}
          noEdit={noEdit}
          isTest={isTestRpcUrls}
          isSort={isSortRpcUrls}
          test={testUrl}
        />
      </Stack>

      <AlertBox>{alert}</AlertBox>

      {(showInvalidRpcUrlCheckbox || isUrlsChanged) && (
        <HStack justify="space-between">
          <Checkbox
            visibility={showInvalidRpcUrlCheckbox ? 'visible' : 'hidden'}
            size="lg"
            colorScheme="purple"
            isChecked={allowInvalidRpcUrl}
            onChange={(e) => setAllowInvalidRpcUrl?.(e.target.checked)}>
            Allow unavailable RPC url
          </Checkbox>

          <Button
            visibility={isUrlsChanged ? 'visible' : 'hidden'}
            colorScheme={saveColorScheme}
            transition="all 0.2s"
            isDisabled={isSaveDisabled}
            onClick={async () => {
              await onSaveUrls?.()
            }}>
            Save
          </Button>
        </HStack>
      )}
    </Stack>
  )
}

export const ExplorerUrlInputGroup = ({
  urls,
  setUrls,
  noAdd,
  noEdit,
  allowNoUrls = true,
  checkUrls,
  onSaveUrls,
  isSaveDisabled,
  isUrlsChanged
}: {
  urls: string[]
  setUrls: (urls: string[]) => void
  noAdd?: boolean
  noEdit?: boolean
  allowNoUrls?: boolean
  checkUrls?: MutableRefObject<(() => string[] | undefined) | undefined>
  onSaveUrls?: () => Promise<void>
  isSaveDisabled?: boolean
  isUrlsChanged?: boolean
}) => {
  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [urls])

  const _checkUrls = useCallback(() => {
    const checkedExplorerUrls = urls.map(checkUrl) as string[]
    if (checkedExplorerUrls.some((url) => !url)) {
      setAlert('Invalid explorer url(s)')
      return
    }
    if (new Set(checkedExplorerUrls).size !== checkedExplorerUrls.length) {
      setAlert('Duplicate explorer url(s)')
      return
    }

    return checkedExplorerUrls
  }, [urls])

  useEffect(() => {
    if (checkUrls) {
      checkUrls.current = _checkUrls
    }
  }, [checkUrls, _checkUrls])

  const [saveColorScheme, setSaveColorScheme] = useState('gray')
  useDebounce(
    () => {
      setSaveColorScheme(isUrlsChanged ? 'purple' : 'gray')
    },
    200,
    [isUrlsChanged]
  )

  return (
    <Stack spacing={6}>
      <FormControl>
        <FormLabel>Block Explorer Url(s)</FormLabel>
        <UrlInputGroup
          urls={urls}
          setUrls={setUrls}
          allowNoUrls={allowNoUrls}
          noAdd={noAdd}
          noEdit={noEdit}
        />
        {!urls.length && !noAdd && (
          <HStack h={12} spacing={8}>
            <Text color="gray.500">No explorer urls.</Text>
            <IconButton
              size="xs"
              aria-label="Add url"
              icon={<AddIcon />}
              onClick={() => setUrls([''])}
            />
          </HStack>
        )}
      </FormControl>

      <AlertBox>{alert}</AlertBox>

      {isUrlsChanged && (
        <HStack justify="end">
          <Button
            visibility={isUrlsChanged ? 'visible' : 'hidden'}
            colorScheme={saveColorScheme}
            transition="all 0.2s"
            isDisabled={isSaveDisabled}
            onClick={async () => {
              await onSaveUrls?.()
            }}>
            Save
          </Button>
        </HStack>
      )}
    </Stack>
  )
}

export const UrlInputGroup = ({
  urls,
  setUrls,
  allowNoUrls,
  noAdd,
  noEdit,
  isTest,
  isSort,
  test
}: {
  urls: string[]
  setUrls: (urls: string[]) => void
  allowNoUrls?: boolean
  noAdd?: boolean
  noEdit?: boolean
  isTest?: boolean
  isSort?: boolean
  test?: (url: string) => Promise<number>
}) => {
  const [testStatuses, setTestStatuses] = useState<
    Map<string, TestStatus | undefined>
  >(new Map())

  const maxHeight = useRef(0)

  const setTestStatus = useCallback(
    (url: string, status: TestStatus | undefined) => {
      setTestStatuses((testStatuses) => {
        const existing = testStatuses.get(url)
        if (!existing && !status) {
          return testStatuses
        }
        if (existing && status && stableHash(existing) === stableHash(status)) {
          return testStatuses
        }

        const height = status?.height || 0
        if (height > maxHeight.current) {
          maxHeight.current = height
        }

        const m = new Map(testStatuses.entries())
        m.set(url, status)

        return m
      })
    },
    []
  )

  const check = useCallback(async () => {
    if (!isTest || !test) {
      return
    }

    maxHeight.current = 0

    const promises = []
    for (const url of urls) {
      const checkedUrl = checkUrl(url)
      if (!checkedUrl) {
        setTestStatus(url, undefined)
        continue
      }

      setTestStatus(url, {
        ...testStatuses.get(url),
        loading: true
      })

      promises.push(
        (async () => {
          try {
            const start = Date.now()
            const height = await test(checkedUrl)
            setTestStatus(url, {
              available: true,
              latency: Date.now() - start,
              height
            })
          } catch (err) {
            // console.error(err)
            setTestStatus(url, {
              available: false
            })
          }
        })()
      )
    }

    await Promise.all(promises)
  }, [urls, isTest, test, testStatuses, setTestStatus])

  const checkRef = useRef<Function>()
  useEffect(() => {
    checkRef.current = check
  }, [check])

  const { retry, loading } = useAsyncRetry(async () => {
    if (isTest && checkRef.current) {
      await checkRef.current()
    }
  }, [isTest])

  useInterval(retry, isTest && !loading ? 5000 : null)

  useEffect(() => {
    if (!isSort) {
      return
    }
    const sorted = urls.slice().sort((a, b) => {
      const aStatus = testStatuses.get(a)
      const bStatus = testStatuses.get(b)
      return compareScore(aStatus, bStatus)
    })
    if (sorted.every((url, i) => url === urls[i])) {
      return
    }
    setUrls(sorted)
  }, [isSort, urls, setUrls, testStatuses])

  return (
    <Stack spacing={3}>
      {urls.map((url, index) => {
        return (
          <UrlInput
            key={index}
            index={index}
            urls={urls}
            allowNoUrls={allowNoUrls}
            noAdd={noAdd}
            noEdit={noEdit}
            setUrls={setUrls}
            isSort={isSort}
            testStatus={testStatuses.get(url)}
            maxHeight={maxHeight.current}
          />
        )
      })}
    </Stack>
  )
}

const UrlInput = ({
  index,
  urls,
  setUrls,
  allowNoUrls,
  noAdd,
  noEdit,
  isSort,
  testStatus,
  maxHeight
}: {
  index: number
  urls: string[]
  setUrls: (urls: string[]) => void
  allowNoUrls?: boolean
  noAdd?: boolean
  noEdit?: boolean
  isSort?: boolean
  testStatus: TestStatus | undefined
  maxHeight: number
}) => {
  const url = urls[index]

  return (
    <HStack>
      <InputGroup size={!noEdit ? 'lg' : 'md'}>
        <Input
          sx={{ paddingInlineEnd: '56px' }}
          errorBorderColor="red.500"
          isInvalid={!!url && !checkUrl(url)}
          value={url}
          onChange={(e) => {
            if (noEdit) {
              return
            }
            setUrls([
              ...urls.slice(0, index),
              e.target.value.trim(),
              ...urls.slice(index + 1)
            ])
          }}
        />
        <InputRightElement w={16}>
          <HStack justify="end" w={12} spacing={0}>
            {urls.length > 1 && index === 0 && (
              <IconButton
                as="div"
                size="xs"
                variant="link"
                aria-label="Active"
                icon={
                  <Popover isLazy trigger="hover" placement="top">
                    <PopoverTrigger>
                      <Center w="4" h="4" borderRadius="50%" bg="purple.500" />
                    </PopoverTrigger>
                    <PopoverContent w="auto">
                      <PopoverArrow />
                      <PopoverBody>Active</PopoverBody>
                    </PopoverContent>
                  </Popover>
                }
              />
            )}

            {testStatus && (
              <IconButton
                as="div"
                size="xs"
                variant="link"
                aria-label="Availability"
                isLoading={testStatus.loading}
                icon={
                  <Popover isLazy trigger="hover" placement="top">
                    <PopoverTrigger>
                      <Center
                        w="4"
                        h="4"
                        borderRadius="50%"
                        bg={
                          !testStatus.available
                            ? 'red.500'
                            : testStatus.height! + 1 >= maxHeight &&
                              testStatus.latency! < 1000
                            ? 'green.500'
                            : 'yellow.500'
                        }
                      />
                    </PopoverTrigger>
                    <PopoverContent w="auto">
                      <PopoverArrow />
                      <PopoverBody>
                        {!testStatus.available ? (
                          'Unavailable'
                        ) : (
                          <Stack>
                            <HStack>
                              <Text fontWeight="medium">Height:</Text>
                              <Text>{testStatus.height}</Text>
                            </HStack>
                            <HStack>
                              <Text fontWeight="medium">Latency:</Text>
                              <Text>
                                {new Decimal(testStatus.latency || 0)
                                  .div(1000)
                                  .toDecimalPlaces(3)
                                  .toString()}
                                s
                              </Text>
                            </HStack>
                          </Stack>
                        )}
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                }
              />
            )}
          </HStack>
        </InputRightElement>
      </InputGroup>

      <Stack spacing={0}>
        <IconButton
          size="xs"
          variant="link"
          aria-label="Move up"
          icon={<TriangleUpIcon />}
          isDisabled={isSort || index <= 0}
          onClick={() =>
            setUrls([
              ...urls.slice(0, index - 1),
              urls[index],
              urls[index - 1],
              ...urls.slice(index + 1)
            ])
          }
        />

        <IconButton
          size="xs"
          variant="link"
          aria-label="Move down"
          icon={<TriangleDownIcon />}
          isDisabled={isSort || index >= urls.length - 1}
          onClick={() =>
            setUrls([
              ...urls.slice(0, index),
              urls[index + 1],
              urls[index],
              ...urls.slice(index + 2)
            ])
          }
        />
      </Stack>

      <IconButton
        size="xs"
        aria-label="Remove url"
        icon={<MinusIcon />}
        visibility={urls.length > 1 || allowNoUrls ? 'visible' : 'hidden'}
        onClick={() =>
          setUrls([...urls.slice(0, index), ...urls.slice(index + 1)])
        }
      />

      {!noAdd && (
        <IconButton
          size="xs"
          aria-label="Add url"
          icon={<AddIcon />}
          visibility={index === urls.length - 1 ? 'visible' : 'hidden'}
          onClick={() => setUrls([...urls, ''])}
        />
      )}
    </HStack>
  )
}

export function checkUrl(url: string) {
  try {
    const u = new URL(url)
    if (!['https:', 'http:', 'wss:', 'ws:'].includes(u.protocol)) {
      return false
    }
    return u.toString().replace(/\/+$/, '')
  } catch {
    return false
  }
}
