import { Box, Button, SimpleGrid } from '@chakra-ui/react'
import { shuffled } from '@ethersproject/random'
import { useEffect, useState } from 'react'

interface MnemonicRememberProps {
  mnemonic: string[]
  remembered?: boolean
  setRemembered: (value: boolean) => void
}

export const MnemonicRemember = ({
  mnemonic,
  remembered,
  setRemembered
}: MnemonicRememberProps) => {
  const [candidate, setCandidate] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])

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
  }, [mnemonic, selected, setRemembered])

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
    <>
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
    </>
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
