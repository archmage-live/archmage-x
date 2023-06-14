import { Container } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { ActionWizard } from '~components/ActionWizard'
import { TitleBar } from '~components/TitleBar'
import { usePassword } from '~lib/password'
import { StepOnboardKeyless } from '~pages/AddWallet/StepOnboardKeyless'
import { StepWalletConnect } from '~pages/AddWallet/StepWalletConnect'

import { StepAddWalletDone } from './StepAddWalletDone'
import { StepAddWalletSelect } from './StepAddWalletSelect'
import {
  StepConnectHardwareWallet,
  StepConnectHardwareWalletAccounts
} from './StepConnectHardwareWallet'
import { StepCreatePassword } from './StepCreatePassword'
import { StepGenerateMnemonic } from './StepGenerateMnemonic'
import { StepImportWallet } from './StepImportWallet'
import { StepRememberMnemonic } from './StepRememberMnemonic'
import { AddWalletKind, useAddWalletKind } from './addWallet'

export default function AddWallet() {
  const { exists: passwordExists, isLocked } = usePassword()
  const navigate = useNavigate()

  useEffect(() => {
    if (passwordExists && isLocked) {
      navigate(`/unlock?redirect=/tab/add-wallet`, { replace: true })
    }
  }, [passwordExists, isLocked, navigate])

  const [addWalletKind] = useAddWalletKind()

  const StepAddWalletBegin = () => {
    switch (addWalletKind) {
      case AddWalletKind.NEW_HD:
        return <StepGenerateMnemonic />
      case AddWalletKind.IMPORT_HD:
      case AddWalletKind.IMPORT_PRIVATE_KEY:
      case AddWalletKind.IMPORT_PRIVATE_KEY_GROUP:
      case AddWalletKind.IMPORT_WATCH_ADDRESS:
      case AddWalletKind.IMPORT_WATCH_ADDRESS_GROUP:
        return <StepImportWallet />
      case AddWalletKind.CONNECT_HARDWARE:
      case AddWalletKind.CONNECT_HARDWARE_GROUP:
        return <StepConnectHardwareWallet />
      case AddWalletKind.WALLET_CONNECT:
      case AddWalletKind.WALLET_CONNECT_GROUP:
        return <StepWalletConnect />
      case AddWalletKind.KEYLESS:
      case AddWalletKind.KEYLESS_HD:
      case AddWalletKind.KEYLESS_GROUP:
        return <StepOnboardKeyless />
    }
  }

  const StepAddWalletEnd = () => {
    switch (addWalletKind) {
      case AddWalletKind.NEW_HD:
        return <StepRememberMnemonic />
      case AddWalletKind.CONNECT_HARDWARE:
      case AddWalletKind.CONNECT_HARDWARE_GROUP:
        return <StepConnectHardwareWalletAccounts />
      default:
        return null
    }
  }

  return passwordExists !== undefined ? (
    <>
      <TitleBar />

      <Container centerContent mt="16" mb="32">
        <ActionWizard hideLastStepBackButton>
          {!passwordExists && <StepCreatePassword />}

          <StepAddWalletSelect />

          <StepAddWalletBegin />

          <StepAddWalletEnd />

          <StepAddWalletDone />
        </ActionWizard>
      </Container>
    </>
  ) : (
    <></>
  )
}
