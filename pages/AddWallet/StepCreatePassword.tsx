import {
  Button,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Text
} from '@chakra-ui/react'
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core'
import zxcvbnCommon from '@zxcvbn-ts/language-common'
import zxcvbnEn from '@zxcvbn-ts/language-en'
import assert from 'assert'
import { ReactNode, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertText } from '~components/AlertText'
import { WALLET_SERVICE } from '~lib/services/walletService'

import { usePassword } from './addWallet'

zxcvbnOptions.setOptions({
  translations: zxcvbnEn.translations,
  graphs: zxcvbnCommon.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommon.dictionary,
    ...zxcvbnEn.dictionary
  }
})

const passwordStrengths = ['Weak', 'Weak', 'Medium', 'Strong', 'Strong']
const passwordStrengthColors = ['red', 'red', 'orange', 'green', 'green']

export const StepCreatePassword = () => {
  const { nextStep } = useWizard()

  const [password, setPassword] = usePassword()
  useEffect(
    () => setPassword(''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(-1)
  const [alert, setAlert] = useState<ReactNode | string>('')

  useEffect(() => {
    if (!password) {
      setPasswordStrength(-1)
      setAlert('')
      return
    }

    const {
      score,
      feedback: { warning, suggestions }
    } = zxcvbn(password)

    setPasswordStrength(score)

    let alert: ReactNode | string = ''
    if (warning || suggestions.length) {
      if (!suggestions.length) {
        alert = warning
      } else if (!warning) {
        alert = suggestions.join(' ')
      } else {
        alert = (
          <>
            {warning}
            <br />
            {suggestions.join(' ')}
          </>
        )
      }
    }
    setAlert(alert)
  }, [password])

  useEffect(() => {
    setAlert('')
  }, [confirmPassword])

  const createPassword = async () => {
    if (password !== confirmPassword) {
      setAlert("Passwords don't match")
      return
    }
    await WALLET_SERVICE.createPassword(password)
    assert(await WALLET_SERVICE.checkPassword(password))
    nextStep()
  }

  return (
    <Stack p="4" pt="16" spacing="12">
      <Stack>
        <HStack justify="center">
          <Text fontSize="4xl" fontWeight="bold">
            Create Password
          </Text>
        </HStack>
        <HStack justify="center">
          <Text fontSize="lg" color="gray.500">
            You will use this to unlock your wallets on this device.
          </Text>
        </HStack>
      </Stack>

      <InputGroup>
        <Input
          type="password"
          size="lg"
          sx={{ paddingInlineEnd: '20' }}
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {passwordStrength > -1 && (
          <InputRightElement
            w="20"
            right="4"
            top="4px"
            justifyContent="end"
            color={passwordStrengthColors[passwordStrength]}
            fontWeight="bold">
            {passwordStrengths[passwordStrength]}
          </InputRightElement>
        )}
      </InputGroup>
      <Input
        type="password"
        size="lg"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />

      <AlertText>{alert}</AlertText>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        disabled={!(passwordStrength >= 2 && confirmPassword)}
        onClick={createPassword}>
        Continue
      </Button>
    </Stack>
  )
}
