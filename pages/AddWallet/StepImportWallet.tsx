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
  chakra
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { HdPathInput } from '~components/HdPathInput'
import { SwitchBar } from '~pages/AddWallet/SwitchBar'

const importKinds = ['Mnemonic', 'Private Key']
const mnemonicLengths = [12, 15, 18, 21, 24]

export const StepImportWallet = () => {
  const { nextStep } = useWizard()

  const [kind, setKind] = useState(importKinds[0])

  const [mnemonicLen, setMnemonicLen] = useState(mnemonicLengths[0])
  const [words, setWords] = useState<string[]>([])

  useEffect(() => {
    setWords((words) => {
      if (words.length < mnemonicLen) {
        return words.concat(...new Array(mnemonicLen - words.length).fill(''))
      } else if (words.length > mnemonicLen) {
        return words.slice(0, mnemonicLen)
      }
      return words
    })
  }, [mnemonicLen])

  const resetWords = () => {
    setWords((words) => words.slice().fill(''))
  }

  const onWordInput = (word: string, index: number) => {
    setWords((words) => {
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
  const [hdPath, setHdPath] = useState<string | undefined>("m/44'/60'/0'/0/0")

  const [privateKey, setPrivateKey] = useState('')

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

          <HStack justify="center">
            <SwitchBar targets={importKinds} value={kind} onChange={setKind} />
          </HStack>
        </Stack>

        <Divider />

        {kind === 'Mnemonic' ? (
          <Stack spacing={8}>
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
                {words.map((word, index) => {
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
          </Stack>
        ) : (
          <>
            <Input
              type="password"
              size="lg"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
            />
          </>
        )}
      </Stack>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        onClick={nextStep}>
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
    <InputGroup bg="blackAlpha.400">
      <InputLeftElement pointerEvents="none">
        <chakra.span color="gray.500" userSelect="none">
          {index + 1}
        </chakra.span>
      </InputLeftElement>
      <Input value={value} onChange={(e) => onChange(e.target.value, index)} />
    </InputGroup>
  )
}
