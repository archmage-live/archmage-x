import {
  Button,
  Checkbox,
  Divider,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  chakra,
  useColorModeValue
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { SwitchBar } from '~/components/SwitchBar'
import { AlertBox } from '~components/AlertBox'
import { HdPathInput } from '~components/HdPathInput'
import { isMnemonic, isPrivateKey } from '~lib/utils'

import { NameInput } from './NameInput'
import {
  AddWalletKind,
  useAddWallet,
  useAddWalletKind,
  useHdPath,
  useMnemonic,
  useName,
  usePrivateKey
} from './addWallet'

const importKinds = ['Mnemonic', 'Private Key']
const mnemonicLengths = [12, 15, 18, 21, 24]

export const StepImportWallet = () => {
  const { nextStep } = useWizard()

  const [kind, setKind] = useState(importKinds[0])

  const [mnemonicLen, setMnemonicLen] = useState(mnemonicLengths[0])
  const [mnemonic, setMnemonic] = useMnemonic()

  useEffect(() => {
    setMnemonic((words) => {
      if (words.length < mnemonicLen) {
        return words.concat(...new Array(mnemonicLen - words.length).fill(''))
      } else if (words.length > mnemonicLen) {
        return words.slice(0, mnemonicLen)
      }
      return words
    })
  }, [mnemonicLen, setMnemonic])

  const resetWords = () => {
    setMnemonic((words) => words.slice().fill(''))
  }

  const onWordInput = (word: string, index: number) => {
    setMnemonic((words) => {
      const splits = word.split(' ').filter((v) => v)
      if (splits.length >= mnemonicLengths[0]) {
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
  const [hdPath, setHdPath] = useHdPath()
  useEffect(() => {
    setHdPath("m/44'/60'/0'/0/0")
  }, [setHdPath])

  const [, setAddWalletKind] = useAddWalletKind()
  const [privateKey, setPrivateKey] = usePrivateKey()
  const [name, setName] = useName()

  useEffect(() => {
    if (kind === importKinds[0]) {
      setAddWalletKind(
        !isOneAccountChecked
          ? AddWalletKind.IMPORT_HD
          : AddWalletKind.IMPORT_MNEMONIC_PRIVATE_KEY
      )
    } else {
      setAddWalletKind(AddWalletKind.IMPORT_PRIVATE_KEY)
    }
  }, [isOneAccountChecked, kind, setAddWalletKind])

  const [alert, setAlert] = useState('')

  useEffect(() => {
    setAlert('')
  }, [mnemonic, privateKey, name, isOneAccountChecked])

  const addWallet = useAddWallet()

  const onImport = useCallback(async () => {
    if (kind === importKinds[0]) {
      if (!isMnemonic(mnemonic.join(' '))) {
        setAlert('Invalid secret recovery phrase')
        return
      }
    } else {
      if (!isPrivateKey(privateKey)) {
        setAlert('Invalid private key')
        return
      }
    }

    const { error } = await addWallet()
    if (error) {
      setAlert(error)
      return
    }

    nextStep()
  }, [addWallet, kind, mnemonic, nextStep, privateKey])

  return (
    <Stack p="4" pt="16" spacing="12">
      <Stack spacing="6">
        <Stack>
          <Text fontSize="4xl" fontWeight="bold" textAlign="center">
            Import Wallet
          </Text>
          <Text fontSize="lg" color="gray.500" textAlign="center">
            Import an existing wallet with your secret recovery phrase or
            private key.
          </Text>

          <HStack justify="center" pt="4">
            <SwitchBar targets={importKinds} value={kind} onChange={setKind} />
          </HStack>
        </Stack>

        <Divider />

        <Stack spacing={8}>
          {kind === importKinds[0] ? (
            <>
              <Stack spacing={4}>
                <HStack justify="end">
                  <Button variant="outline" onClick={resetWords}>
                    Reset
                  </Button>
                  <Select
                    w={32}
                    value={mnemonicLen}
                    onChange={(e) => setMnemonicLen(+e.target.value)}>
                    {mnemonicLengths.map((len) => {
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
                  <chakra.span color="gray.400" fontSize="xl">
                    Import only one account at specified HD path.
                  </chakra.span>
                </Checkbox>

                {isOneAccountChecked && (
                  <HdPathInput value={hdPath} onChange={setHdPath} />
                )}
              </Stack>
            </>
          ) : (
            <Textarea
              size="lg"
              resize="none"
              placeholder="Private Key"
              sx={{ WebkitTextSecurity: 'disc' }}
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value.trim())}
            />
          )}

          <NameInput value={name} onChange={setName} />

          <AlertBox>{alert}</AlertBox>
        </Stack>
      </Stack>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        disabled={
          kind === importKinds[0]
            ? mnemonic.length !== mnemonicLen || !mnemonic.every((w) => w)
            : !privateKey
        }
        onClick={onImport}>
        Import Wallet
      </Button>
    </Stack>
  )
}

const WordInput = ({
  index,
  value,
  onChange
}: {
  index: number
  value: string
  onChange: (value: string, index: number) => void
}) => {
  return (
    <InputGroup bg={useColorModeValue('gray.50', 'blackAlpha.400')}>
      <InputLeftElement pointerEvents="none">
        <chakra.span color="gray.500" userSelect="none">
          {index + 1}
        </chakra.span>
      </InputLeftElement>
      <Input value={value} onChange={(e) => onChange(e.target.value, index)} />
    </InputGroup>
  )
}
