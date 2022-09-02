import {
  Box,
  BoxProps,
  Button,
  HStack,
  Input,
  Stack,
  Text
} from '@chakra-ui/react'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wizard, useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { usePassword } from '~lib/password'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { createTab } from '~lib/util'

interface PasswordActionProps extends BoxProps {
  children: React.ReactElement | React.ReactElement[]

  onClose(): void
}

export const ValidatedAction = ({
  children,
  onClose,
  ...props
}: PasswordActionProps) => {
  return (
    <Box {...props}>
      <Wizard>
        <ValidatePassword onClose={onClose} />

        {React.Children.map(children, (el) =>
          React.cloneElement(el, { onClose })
        )}
      </Wizard>
    </Box>
  )
}

const ValidatePassword = ({ onClose }: { onClose(): void }) => {
  const { nextStep } = useWizard()

  const navigate = useNavigate()
  const { exists: passwordExists, isUnlocked } = usePassword()

  const [password, setPassword] = useState('')
  const [alert, setAlert] = useState('')

  useEffect(() => {
    setAlert('')
  }, [password])

  useEffect(() => {
    if (passwordExists === false) {
      createTab('/tab/add-wallet')
      window.close()
    }
  }, [passwordExists])

  useEffect(() => {
    if (isUnlocked === false) {
      navigate('/', { replace: true })
    }
  }, [isUnlocked, navigate])

  const onCheck = useCallback(
    (event: any) => {
      event.preventDefault()
      PASSWORD_SERVICE.checkPassword(password).then((ok) => {
        if (!ok) {
          setAlert('Wrong password')
        } else {
          nextStep()
        }
      })
    },
    [nextStep, password]
  )

  return (
    <Stack px="4" py="12" spacing="12">
      <Stack>
        <HStack justify="center">
          <Text fontSize="4xl" fontWeight="bold">
            Archmage X
          </Text>
        </HStack>
        <HStack justify="center">
          <Text fontSize="lg" color="gray.500">
            Validate your password
          </Text>
        </HStack>
      </Stack>

      <form onSubmit={onCheck}>
        <Stack spacing="12">
          <Input
            type="password"
            size="lg"
            placeholder="Password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <AlertBox>{alert}</AlertBox>

          <HStack>
            <Button
              variant="outline"
              colorScheme="purple"
              borderRadius="8px"
              flex={1}
              onClick={onClose}>
              Cancel
            </Button>

            <Button
              type="submit"
              colorScheme="purple"
              borderRadius="8px"
              flex={1}
              disabled={!password}>
              Next
            </Button>
          </HStack>
        </Stack>
      </form>
    </Stack>
  )
}
