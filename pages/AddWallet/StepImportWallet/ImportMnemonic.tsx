import { SearchIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons'
import {
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  chakra,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import { stringToPath } from '@cosmjs/crypto'
import { useCallback, useEffect, useState } from 'react'
import * as React from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { HdPathInput } from '~components/HdPathInput'
import { LEDGER_PATH_SCHEMAS, LedgerPathSchema } from '~lib/hardware/ledger'
import { NETWORK_SCOPES, NetworkKind, getNetworkKind } from '~lib/network'
import { PSEUDO_INDEX } from '~lib/schema'
import {
  ExistingGroupWallet,
  useNextSubWalletIndex
} from '~lib/services/wallet'
import {
  WalletType,
  checkPrivateKeyFromMnemonic,
  isMnemonic
} from '~lib/wallet'
import {
  SelectExistingWalletModal,
  WalletItemButton
} from '~pages/AddWallet/SelectExistingWallet'

import { AccountAbstractionChecker } from '../AccountAbstractionChecker'
import { NameInput } from '../NameInput'
import {
  AddWalletKind,
  useAccounts,
  useAddSubWallets,
  useAddWallet,
  useAddWalletKind,
  useExistingWallet,
  useMnemonic,
  useName
} from '../addWallet'

const wordsNums = [12, 15, 18, 21, 24]

export const ImportMnemonic = () => {
  const { nextStep } = useWizard()

  const [wordsNum, setWordsNum] = useState(wordsNums[0])
  const [viewOnWordIndex, setViewOnWordIndex] = useState<number>()
  const [mnemonic, setMnemonic] = useMnemonic()
  useEffect(() => {
    setMnemonic([])
  }, [setMnemonic])

  useEffect(() => {
    setMnemonic((words) => {
      if (words.length < wordsNum) {
        return words.concat(...new Array(wordsNum - words.length).fill(''))
      } else if (words.length > wordsNum) {
        return words.slice(0, wordsNum)
      }
      return words
    })
    setViewOnWordIndex(undefined)
  }, [wordsNum, setMnemonic])

  const resetWords = () => {
    setMnemonic((words) => words.slice().fill(''))
  }

  const onWordInput = (word: string, index: number) => {
    setMnemonic((words) => {
      const splits = word.split(' ').filter((v) => v)
      if (splits.length >= wordsNums[0]) {
        if (splits.length < words.length) {
          return splits.concat(
            ...new Array(words.length - splits.length).fill('')
          )
        } else {
          return splits.slice(0, words.length)
        }
      }
      return words.slice().fill(word, index, index + 1)
    })
  }

  const [isOneAccountChecked, setIsOneAccountChecked] = useState(false)
  const [hdPath, setHdPath] = useState('')
  useEffect(() => {
    setHdPath("m/44'/60'/0'/0/0")
  }, [setHdPath])

  const [name, setName] = useName()
  useEffect(() => {
    setName('')
  }, [setName])

  const [, setAddWalletKind] = useAddWalletKind()
  const [, setExistingWallet] = useExistingWallet()
  const [willAddToExistingGroupChecked, setWillAddToExistingGroupChecked] =
    useState(false)
  const [existingGroupWallet, setExistingGroupWallet] = useState<
    ExistingGroupWallet | undefined
  >(undefined)
  const [isUseGroupChecked, setIsUseGroupChecked] = useState(false)
  useEffect(() => {
    if (!isOneAccountChecked) {
      setWillAddToExistingGroupChecked(false)
      setExistingGroupWallet(undefined)
    }
  }, [isOneAccountChecked])
  useEffect(() => {
    setExistingWallet(existingGroupWallet?.wallet)
  }, [setExistingWallet, existingGroupWallet])
  useEffect(() => {
    setIsUseGroupChecked(willAddToExistingGroupChecked)
  }, [willAddToExistingGroupChecked])

  useEffect(() => {
    setAddWalletKind(
      !isOneAccountChecked
        ? AddWalletKind.IMPORT_HD
        : !isUseGroupChecked
        ? AddWalletKind.IMPORT_PRIVATE_KEY
        : AddWalletKind.IMPORT_PRIVATE_KEY_GROUP
    )
  }, [isOneAccountChecked, isUseGroupChecked, setAddWalletKind])

  const nextIndex = useNextSubWalletIndex(existingGroupWallet?.wallet.id)

  const [accounts, setAccounts] = useAccounts()
  useEffect(() => {
    if (nextIndex === undefined) {
      return
    }
    const m = mnemonic.join(' ')
    const w = checkPrivateKeyFromMnemonic(m, hdPath)
    setAccounts(
      [
        {
          index: isUseGroupChecked ? nextIndex : PSEUDO_INDEX,
          hash: w ? w.address : '',
          mnemonic: m,
          path: hdPath
        }
      ],
      isUseGroupChecked
    )
  }, [mnemonic, hdPath, nextIndex, isUseGroupChecked, setAccounts])

  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [mnemonic, name, isOneAccountChecked])

  const addWallet = useAddWallet()
  const addSubWallets = useAddSubWallets()

  const onImport = useCallback(async () => {
    if (!isMnemonic(mnemonic.join(' '))) {
      setAlert('Invalid secret recovery phrase')
      return
    }

    let hashes = accounts.map(({ hash }) => hash)
    if (!hashes.every(Boolean)) {
      setAlert('Invalid secret recovery phrase')
      return
    }

    if (
      new Set(hashes.concat(existingGroupWallet?.hashes || [])).size !==
      hashes.length + (existingGroupWallet?.hashes.length || 0)
    ) {
      setAlert('Duplicate private key (derived from secret recovery phrase)')
      return
    }

    if (!willAddToExistingGroupChecked) {
      const { error } = await addWallet()
      if (error) {
        setAlert(error)
        return
      }
    } else {
      const { error } = await addSubWallets()
      if (error) {
        setAlert(error)
        return
      }
    }

    nextStep().then()
  }, [
    mnemonic,
    accounts,
    addWallet,
    addSubWallets,
    willAddToExistingGroupChecked,
    existingGroupWallet,
    nextStep
  ])

  const {
    isOpen: isSelectPathOpen,
    onOpen: onSelectPathOpen,
    onClose: onSelectPathClose
  } = useDisclosure()

  const {
    isOpen: isSelectWalletOpen,
    onOpen: onSelectWalletOpen,
    onClose: onSelectWalletClose
  } = useDisclosure()

  return (
    <Stack spacing={12}>
      <Stack spacing={8}>
        <Stack spacing={4}>
          <HStack justify="end">
            <Button variant="outline" onClick={resetWords}>
              Reset
            </Button>
            <Select
              w={32}
              value={wordsNum}
              onChange={(e) => setWordsNum(+e.target.value)}>
              {wordsNums.map((len) => {
                return (
                  <option key={len} value={len}>
                    {len} words
                  </option>
                )
              })}
            </Select>
          </HStack>

          <SimpleGrid columns={3} gap={4}>
            {mnemonic.map((word, index) => {
              return (
                <WordInput
                  key={index}
                  index={index}
                  value={word}
                  onChange={onWordInput}
                  isViewOn={viewOnWordIndex === index}
                  toggleIsViewOn={() =>
                    setViewOnWordIndex((i) => (i === index ? undefined : index))
                  }
                />
              )
            })}
          </SimpleGrid>
        </Stack>

        <Stack spacing={4}>
          <Checkbox
            size="lg"
            colorScheme="purple"
            isChecked={isOneAccountChecked}
            onChange={(e) => setIsOneAccountChecked(e.target.checked)}>
            <HStack color="gray.500">
              <chakra.span fontSize="lg">
                Import only one account at specified HD path.
              </chakra.span>

              <IconButton
                aria-label="Select HD path from network"
                size="sm"
                fontSize="sm"
                icon={<SearchIcon />}
                isDisabled={!isOneAccountChecked}
                onClick={onSelectPathOpen}
              />
            </HStack>
          </Checkbox>

          {isOneAccountChecked && (
            <HdPathInput value={hdPath} onChange={setHdPath} />
          )}
        </Stack>

        {isOneAccountChecked && (
          <>
            <Stack>
              <Checkbox
                size="lg"
                colorScheme="purple"
                isChecked={willAddToExistingGroupChecked}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelectWalletOpen()
                  } else {
                    setWillAddToExistingGroupChecked(false)
                    setExistingGroupWallet(undefined)
                  }
                }}>
                <chakra.span color="gray.500" fontSize="lg">
                  Add to an existing private-key group wallet.
                </chakra.span>
              </Checkbox>

              {existingGroupWallet && (
                <WalletItemButton
                  wallet={existingGroupWallet}
                  onClick={onSelectWalletOpen}
                  buttonVariant="outline"
                />
              )}
            </Stack>

            {!willAddToExistingGroupChecked && (
              <Checkbox
                size="lg"
                colorScheme="purple"
                isChecked={isUseGroupChecked}
                onChange={(e) => setIsUseGroupChecked(e.target.checked)}>
                <chakra.span color="gray.500" fontSize="lg">
                  Create group to manage this account.
                </chakra.span>
              </Checkbox>
            )}
          </>
        )}

        {!willAddToExistingGroupChecked && (
          <NameInput
            value={name}
            onChange={setName}
            placeholder={
              isUseGroupChecked ? 'Group Name (Optional)' : undefined
            }
          />
        )}

        <AccountAbstractionChecker />

        <AlertBox>{alert}</AlertBox>
      </Stack>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        isDisabled={mnemonic.length !== wordsNum || !mnemonic.every((w) => w)}
        onClick={onImport}>
        Continue
      </Button>

      <SelectHdPathModal
        isOpen={isSelectPathOpen}
        onClose={onSelectPathClose}
        hdPath={hdPath}
        setHdPath={setHdPath}
      />

      <SelectExistingWalletModal
        walletType={WalletType.PRIVATE_KEY_GROUP}
        selected={existingGroupWallet}
        onSelected={(w) => {
          setWillAddToExistingGroupChecked(true)
          setExistingGroupWallet(w)
        }}
        isOpen={isSelectWalletOpen}
        onClose={onSelectWalletClose}
      />
    </Stack>
  )
}

const WordInput = ({
  index,
  value,
  onChange,
  isViewOn,
  toggleIsViewOn
}: {
  index: number
  value: string
  onChange: (value: string, index: number) => void
  // https://www.halborn.com/disclosures/demonic-vulnerability
  // Split the Mnemonic Phrase input field into several fields (one per word) and ensure that only one is revealed at a time
  isViewOn: boolean
  toggleIsViewOn: () => void
}) => {
  return (
    <InputGroup bg={useColorModeValue('gray.50', 'blackAlpha.400')}>
      <InputLeftElement pointerEvents="none">
        <chakra.span color="gray.500" userSelect="none">
          {index + 1}
        </chakra.span>
      </InputLeftElement>

      <Input
        type={isViewOn ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value, index)}
      />

      <InputRightElement cursor="pointer" onClick={toggleIsViewOn}>
        {isViewOn ? <ViewIcon /> : <ViewOffIcon />}
      </InputRightElement>
    </InputGroup>
  )
}

const SelectHdPathModal = ({
  isOpen,
  onClose,
  hdPath,
  setHdPath
}: {
  isOpen: boolean
  onClose: () => void
  hdPath: string
  setHdPath: (hdPath: string) => void
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      returnFocusOnClose={false}
      isCentered
      motionPreset="slideInBottom"
      scrollBehavior="inside"
      size="lg">
      <ModalOverlay />
      <ModalContent maxH="100%" my={0}>
        <ModalHeader>Select HD path from network</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={0}>
          {isOpen && (
            <SelectHdPath
              onClose={onClose}
              hdPath={hdPath}
              setHdPath={setHdPath}
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const SelectHdPath = ({
  onClose,
  hdPath,
  setHdPath
}: {
  onClose: () => void
  hdPath: string
  setHdPath: (hdPath: string) => void
}) => {
  const [networkKind, setNetworkKind] = useState(NetworkKind.EVM)

  const [pathSchemaIndex, setPathSchemaIndex] = useState<number>()
  const [pathSchema, setPathSchema] = useState<LedgerPathSchema>()

  useEffect(() => {
    for (const [networkKind, pathSchemes] of LEDGER_PATH_SCHEMAS) {
      const pathSchemeIndex = pathSchemes.findIndex(
        (pathSchema) => pathSchema.pathTemplate === hdPath
      )
      if (pathSchemeIndex > -1) {
        setNetworkKind(networkKind)
        setPathSchemaIndex(pathSchemeIndex)
        return
      }
    }

    const pathSchemas = LEDGER_PATH_SCHEMAS.get(NetworkKind.EVM)
    setPathSchemaIndex(pathSchemas?.length ? 0 : undefined)
  }, [hdPath])

  useEffect(() => {
    const pathSchemas = LEDGER_PATH_SCHEMAS.get(networkKind)
    if (!pathSchemas?.length || pathSchemaIndex === undefined) {
      setPathSchema(undefined)
    } else {
      setPathSchema(pathSchemas[pathSchemaIndex])
    }
  }, [networkKind, pathSchemaIndex])

  return (
    <Stack px={4} pb={6} spacing={12}>
      <Stack spacing={6}>
        <Divider />

        <FormControl>
          <FormLabel>Network Kind</FormLabel>
          <Select
            w={48}
            value={networkKind}
            onChange={(e) => {
              const networkKind = e.target.value as NetworkKind
              setNetworkKind(networkKind)
              const pathSchemas = LEDGER_PATH_SCHEMAS.get(networkKind)
              setPathSchemaIndex(pathSchemas?.length ? 0 : undefined)
            }}>
            {NETWORK_SCOPES.map((scope) => {
              return (
                <option key={scope} value={getNetworkKind(scope)}>
                  {scope}
                </option>
              )
            })}
          </Select>
        </FormControl>

        {typeof pathSchemaIndex === 'number' && (
          <>
            <FormControl>
              <FormLabel>HD path</FormLabel>
              <HStack spacing={8}>
                <Select
                  w={48}
                  value={pathSchemaIndex}
                  onChange={(e) => setPathSchemaIndex(+e.target.value)}>
                  {LEDGER_PATH_SCHEMAS.get(networkKind)?.map(
                    (schema, index) => {
                      return (
                        <option key={index} value={index}>
                          {schema.description}
                        </option>
                      )
                    }
                  )}
                </Select>

                {pathSchema && (
                  <HdPathInput
                    forcePrefixLength={
                      stringToPath(pathSchema.pathTemplate).length
                    }
                    fixedLength
                    value={pathSchema.pathTemplate}
                  />
                )}
              </HStack>
            </FormControl>
          </>
        )}
      </Stack>

      <HStack justify="center" spacing={12}>
        <Button size="lg" w={36} variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="lg"
          w={36}
          colorScheme="purple"
          isDisabled={!pathSchema}
          onClick={() => {
            if (pathSchema) {
              setHdPath(pathSchema.pathTemplate)
            }
            onClose()
          }}>
          Confirm
        </Button>
      </HStack>
    </Stack>
  )
}
