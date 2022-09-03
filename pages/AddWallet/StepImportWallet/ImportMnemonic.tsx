import {
  Button,
  Checkbox,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Stack,
  chakra,
  useColorModeValue
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { HdPathInput } from '~components/HdPathInput'
import { isMnemonic } from '~lib/utils'

import { NameInput } from '../NameInput'
import {
  AddWalletKind,
  useAddWallet,
  useAddWalletKind,
  useHdPath,
  useMnemonic,
  useName
} from '../addWallet'

const wordsNums = [12, 15, 18, 21, 24]

export const ImportMnemonic = () => {
  const { nextStep } = useWizard()

  const [wordsNum, setWordsNum] = useState(wordsNums[0])
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
  const [hdPath, setHdPath] = useHdPath()
  useEffect(() => {
    setHdPath("m/44'/60'/0'/0/0")
  }, [setHdPath])

  const [name, setName] = useName()
  useEffect(() => {
    setName('')
  }, [setName])

  const [, setAddWalletKind] = useAddWalletKind()
  useEffect(() => {
    setAddWalletKind(
      !isOneAccountChecked
        ? AddWalletKind.IMPORT_HD
        : AddWalletKind.IMPORT_MNEMONIC_PRIVATE_KEY
    )
  }, [isOneAccountChecked, setAddWalletKind])

  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [mnemonic, name, isOneAccountChecked])

  const addWallet = useAddWallet()

  const onImport = useCallback(async () => {
    if (!isMnemonic(mnemonic.join(' '))) {
      setAlert('Invalid secret recovery phrase')
      return
    }

    const { error } = await addWallet()
    if (error) {
      setAlert(error)
      return
    }

    nextStep()
  }, [addWallet, mnemonic, nextStep])

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

        <NameInput value={name} onChange={setName} />

        <AlertBox>{alert}</AlertBox>
      </Stack>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        disabled={mnemonic.length !== wordsNum || !mnemonic.every((w) => w)}
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
