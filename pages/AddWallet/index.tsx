import { Container } from '@chakra-ui/react'

import { ActionWizard } from '~components/ActionWizard'
import { TitleBar } from '~components/TitleBar'

import { StepAddWalletDone } from './StepAddWalletDone'
import { StepAddWalletSelect } from './StepAddWalletSelect'
import { StepConnectHardwareWallet } from './StepConnectHardwareWallet'
import { StepCreatePassword } from './StepCreatePassword'
import { StepGenerateMnemonic } from './StepGenerateMnemonic'
import { StepImportWallet } from './StepImportWallet'
import { StepRememberMnemonic } from './StepRememberMnemonic'
import { AddWalletKind, useAddWalletKind } from './addWallet'

export default function AddWallet() {
  const hasPassword = false

  const [addWalletKind] = useAddWalletKind()

  return (
    <>
      <TitleBar />

      <Container centerContent mt="16">
        <ActionWizard>
          {!hasPassword && <StepCreatePassword />}

          <StepAddWalletSelect />

          {addWalletKind === AddWalletKind.NEW_HD ? (
            <StepGenerateMnemonic />
          ) : addWalletKind === AddWalletKind.IMPORT_HD ||
            addWalletKind === AddWalletKind.IMPORT_MNEMONIC_PRIVATE_KEY ||
            addWalletKind === AddWalletKind.IMPORT_PRIVATE_KEY ? (
            <StepImportWallet />
          ) : (
            <StepConnectHardwareWallet />
          )}

          {addWalletKind === AddWalletKind.NEW_HD && <StepRememberMnemonic />}

          <StepAddWalletDone />
        </ActionWizard>
      </Container>
    </>
  )
}
