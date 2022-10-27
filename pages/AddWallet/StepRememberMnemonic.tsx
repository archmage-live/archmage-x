import { Button, Checkbox, Stack, Text, chakra } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { MnemonicRemember } from '~components/MnemonicRemember'

import { NameInput } from './NameInput'
import {
  useAddWallet,
  useMnemonic,
  useMnemonicNotBackedUp,
  useName
} from './addWallet'

export const StepRememberMnemonic = () => {
  const { nextStep } = useWizard()

  const [mnemonic] = useMnemonic()
  const [, setMnemonicNotBackedUp] = useMnemonicNotBackedUp()
  const [name, setName] = useName()

  const [remembered, setRemembered] = useState(false)
  const [skipRemember, setSkipRemember] = useState(false)

  useEffect(() => {
    setMnemonicNotBackedUp(skipRemember || !remembered)
  }, [remembered, skipRemember, setMnemonicNotBackedUp])

  const [alert, setAlert] = useState('')

  useEffect(() => {
    setAlert('')
  }, [mnemonic, name])

  const addWallet = useAddWallet()

  const onNext = useCallback(async () => {
    const { error } = await addWallet()
    if (error) {
      setAlert(error)
      return
    }

    await nextStep()
  }, [addWallet, nextStep])

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

      <MnemonicRemember
        mnemonic={mnemonic}
        remembered={remembered}
        setRemembered={setRemembered}
      />

      <Checkbox
        size="lg"
        colorScheme="purple"
        isChecked={skipRemember}
        onChange={(e) => setSkipRemember(e.target.checked)}>
        <chakra.span color="gray.500" fontSize="xl">
          Temporarily skip confirmation
        </chakra.span>
      </Checkbox>

      <NameInput value={name} onChange={setName} />

      <AlertBox>{alert}</AlertBox>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        disabled={!(skipRemember || remembered)}
        onClick={onNext}>
        Continue
      </Button>
    </Stack>
  )
}
