import { Container } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { ActionWizard } from '~components/ActionWizard'
import { TitleBar } from '~components/TitleBar'
import { usePassword } from '~lib/password'

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

  return passwordExists !== undefined ? (
    <>
      <TitleBar />

      <Container centerContent my="16">
        <ActionWizard hideLastStepBackButton>
          {!passwordExists && <StepCreatePassword />}

          <StepAddWalletSelect />

          {addWalletKind === AddWalletKind.NEW_HD ? (
            <StepGenerateMnemonic />
          ) : addWalletKind === AddWalletKind.IMPORT_HD ||
            addWalletKind === AddWalletKind.IMPORT_MNEMONIC_PRIVATE_KEY ||
            addWalletKind === AddWalletKind.IMPORT_PRIVATE_KEY ||
            addWalletKind === AddWalletKind.IMPORT_WATCH_ADDRESS ||
            addWalletKind === AddWalletKind.IMPORT_WATCH_ADDRESS_GROUP ? (
            <StepImportWallet />
          ) : (
            <StepConnectHardwareWallet />
          )}

          {addWalletKind === AddWalletKind.NEW_HD && <StepRememberMnemonic />}

          {(addWalletKind === AddWalletKind.CONNECT_HARDWARE ||
            addWalletKind === AddWalletKind.CONNECT_HARDWARE_GROUP) && (
            <StepConnectHardwareWalletAccounts />
          )}

          <StepAddWalletDone />
        </ActionWizard>
      </Container>
    </>
  ) : (
    <></>
  )
}
