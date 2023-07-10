import {
  Button,
  FormControl,
  FormLabel,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Stack
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import * as React from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { KeylessWalletInfo, isMnemonic } from '~lib/wallet'
import { NameInput } from '~pages/AddWallet/NameInput'
import {
  AddWalletKind,
  useAccountsNum,
  useAddWallet,
  useAddWalletKind,
  useKeylessInfo,
  useName,
  useWalletHash
} from '~pages/AddWallet/addWallet'
import { KeylessOnboardInfo } from '~pages/KeylessOnboard'

import { AccountAbstractionChecker } from '../AccountAbstractionChecker'

export const OnboardKeylessHd = ({
  hash,
  mnemonic,
  info,
  done
}: {
  hash: string
  mnemonic: string
  info: KeylessWalletInfo
  done: () => {}
}) => {
  const { nextStep } = useWizard()

  const [name, setName] = useName()
  const [accountsNum, setAccountsNum] = useAccountsNum()
  useEffect(() => {
    setName('')
    setAccountsNum(1)
  }, [setName, setAccountsNum])

  const [, setAddWalletKind] = useAddWalletKind()
  const [, setWalletHash] = useWalletHash()
  const [, setKeylessInfo] = useKeylessInfo()
  useEffect(() => {
    setAddWalletKind(AddWalletKind.KEYLESS_HD)
    setWalletHash(hash)
    setKeylessInfo(info)
  }, [hash, mnemonic, info, setAddWalletKind, setWalletHash, setKeylessInfo])

  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [hash, mnemonic, info, name])

  const addWallet = useAddWallet()

  const onImport = useCallback(async () => {
    if (!isMnemonic(mnemonic)) {
      setAlert('Invalid keyless connection')
      return
    }

    const { error } = await addWallet()
    if (error) {
      setAlert(error)
      return
    }

    done()

    nextStep().then()
  }, [mnemonic, addWallet, done, nextStep])

  return (
    <Stack spacing={12}>
      <KeylessOnboardInfo info={info} />

      <Stack spacing={8}>
        <NameInput value={name} onChange={setName} />

        <FormControl>
          <FormLabel>Num of accounts</FormLabel>
          <NumberInput
            value={accountsNum}
            onChange={(_, value) => setAccountsNum(value)}
            precision={0}
            step={1}
            min={1}
            max={10}
            keepWithinRange>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <AccountAbstractionChecker />

        <AlertBox>{alert}</AlertBox>
      </Stack>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        onClick={onImport}>
        Continue
      </Button>
    </Stack>
  )
}
