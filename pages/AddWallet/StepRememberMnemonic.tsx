import {
  Box,
  Button,
  Checkbox,
  SimpleGrid,
  Stack,
  Text,
  chakra
} from '@chakra-ui/react'
import { shuffled } from '@ethersproject/random'
import { useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { useMnemonic } from '~pages/AddWallet/state'

export const StepRememberMnemonic = () => {
  const { nextStep } = useWizard()

  const [mnemonic] = useMnemonic()

  const [candidate, setCandidate] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [remembered, setRemembered] = useState(false)
  const [isChecked, setIsChecked] = useState(false)

  useEffect(() => {
    if (mnemonic) {
      setCandidate(shuffled(mnemonic))
    }
  }, [mnemonic])

  useEffect(() => {
    setRemembered(
      mnemonic?.length === selected.length &&
        mnemonic?.every((word, index) => word === selected[index])
    )
  }, [mnemonic, selected])

  const clickWord = (word: string, select: boolean) => {
    if (select) {
      setCandidate((candidate) => {
        candidate.splice(candidate.indexOf(word), 1)
        return candidate.slice()
      })
      setSelected((selected) => {
        selected.push(word)
        return selected.slice()
      })
    } else {
      setCandidate((candidate) => {
        candidate.push(word)
        return candidate.slice()
      })
      setSelected((selected) => {
        selected.splice(selected.indexOf(word), 1)
        return selected.slice()
      })
    }
  }

  return (
    <Stack p="4" pt="16" spacing="12">
      <Stack>
        <Text fontSize="4xl" fontWeight="bold" textAlign="center">
          Secret Recovery Phrase
        </Text>
        <Text
          fontSize="lg"
          fontWeight="bold"
          color="gray.500"
          textAlign="center">
          Please confirm your secret recovery phrase.
        </Text>
      </Stack>

      <Box
        minH="170px"
        p="14px"
        border="1px solid"
        borderColor="gray.700"
        borderRadius="8px">
        <SimpleGrid columns={4} spacing={2}>
          {selected.map((word, index) => {
            return (
              <WordButton
                key={index}
                word={word}
                onClick={() => clickWord(word, false)}
              />
            )
          })}
        </SimpleGrid>
      </Box>
      <Box minH="140px">
        <SimpleGrid columns={4} spacing={2}>
          {candidate.map((word, index) => {
            return (
              <WordButton
                key={index}
                word={word}
                onClick={() => clickWord(word, true)}
              />
            )
          })}
        </SimpleGrid>
      </Box>

      <Checkbox
        size="lg"
        colorScheme="purple"
        isChecked={isChecked}
        onChange={(e) => setIsChecked(e.target.checked)}>
        <chakra.span color="gray.400" fontSize="xl">
          Temporarily skip confirmation
        </chakra.span>
      </Checkbox>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        disabled={!(isChecked || remembered)}
        onClick={nextStep}>
        Continue
      </Button>
    </Stack>
  )
}

const WordButton = ({
  word,
  onClick
}: {
  word: string
  onClick: () => void
}) => {
  return (
    <Button size="lg" variant="outline" borderRadius="8px" onClick={onClick}>
      {word}
    </Button>
  )
}
