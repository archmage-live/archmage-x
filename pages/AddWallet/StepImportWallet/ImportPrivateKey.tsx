import { Button, Stack, Textarea } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { isPrivateKey } from '~lib/utils'

import { NameInput } from '../NameInput'
import {
  AddWalletKind,
  useAddWallet,
  useAddWalletKind,
  useName,
  usePrivateKey
} from '../addWallet'

export const ImportPrivateKey = () => {
  const { nextStep } = useWizard()

  const [, setAddWalletKind] = useAddWalletKind()
  const [privateKey, setPrivateKey] = usePrivateKey()
  const [name, setName] = useName()
  useEffect(() => {
    setAddWalletKind(AddWalletKind.IMPORT_PRIVATE_KEY)
    setPrivateKey('')
    setName('')
  }, [setAddWalletKind, setPrivateKey, setName])

  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [privateKey, name])

  const addWallet = useAddWallet()

  const onImport = useCallback(async () => {
    if (!isPrivateKey(privateKey)) {
      setAlert('Invalid private key')
      return
    }

    const { error } = await addWallet()
    if (error) {
      setAlert(error)
      return
    }

    nextStep()
  }, [addWallet, nextStep, privateKey])

  return (
    <Stack spacing={12}>
      <Stack spacing={8}>
        <Textarea
          size="lg"
          resize="none"
          placeholder="Private Key"
          sx={{ WebkitTextSecurity: 'disc' }}
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value.trim())}
        />

        <NameInput value={name} onChange={setName} />

        <AlertBox>{alert}</AlertBox>
      </Stack>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        disabled={!privateKey}
        onClick={onImport}>
        Import Wallet
      </Button>
    </Stack>
  )
}
