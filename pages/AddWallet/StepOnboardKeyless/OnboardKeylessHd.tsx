import { Button, Stack } from '@chakra-ui/react'
import { ethers } from 'ethers'
import { useCallback, useEffect, useState } from 'react'
import * as React from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { KeylessWalletInfo, isMnemonic } from '~lib/wallet'
import { NameInput } from '~pages/AddWallet/NameInput'
import {
  AddWalletKind,
  useAddWallet,
  useAddWalletKind,
  useKeylessInfo,
  useName,
  useWalletHash
} from '~pages/AddWallet/addWallet'

import { OnboardKeylessInfo } from './OnboardInfo'

export const OnboardKeylessHd = ({
  mnemonic,
  info
}: {
  mnemonic: string
  info: KeylessWalletInfo
}) => {
  const { nextStep } = useWizard()

  const [name, setName] = useName()
  useEffect(() => {
    setName('')
  }, [setName])

  const [, setAddWalletKind] = useAddWalletKind()
  const [, setWalletHash] = useWalletHash()
  const [, setKeylessInfo] = useKeylessInfo()
  useEffect(() => {
    setAddWalletKind(AddWalletKind.KEYLESS_HD)
    const acc = ethers.utils.HDNode.fromMnemonic(mnemonic)
    setWalletHash(acc.address)
    setKeylessInfo(info)
  }, [mnemonic, info, setAddWalletKind, setWalletHash, setKeylessInfo])

  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [mnemonic, info, name])

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

    nextStep().then()
  }, [mnemonic, nextStep, addWallet])

  return (
    <Stack spacing={12}>
      <OnboardKeylessInfo info={info} />

      <Stack spacing={8}>
        <NameInput value={name} onChange={setName} />
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
