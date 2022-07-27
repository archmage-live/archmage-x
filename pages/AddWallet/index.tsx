import { Container } from '@chakra-ui/react'

import { ActionWizard } from '~components/ActionWizard'
import { TitleBar } from '~components/TitleBar'
import { WalletType } from '~lib/wallet'

import { StepAddWalletDone } from './StepAddWalletDone'
import { StepAddWalletSelect } from './StepAddWalletSelect'
import { StepConnectHardwareWallet } from './StepConnectHardwareWallet'
import { StepCreatePassword } from './StepCreatePassword'
import { StepGenerateMnemonic } from './StepGenerateMnemonic'
import { StepImportWallet } from './StepImportWallet'
import { StepRememberMnemonic } from './StepRememberMnemonic'
import { useWalletType } from './state'

export default function AddWallet() {
  const hasPassword = false

  const [walletType] = useWalletType()

  return (
    <>
      <TitleBar />

      <Container centerContent mt="16">
        <ActionWizard>
          {!hasPassword && <StepCreatePassword />}

          <StepAddWalletSelect />

          {walletType === WalletType.HD ? (
            <StepGenerateMnemonic />
          ) : walletType === WalletType.PRIVATE_KEY ||
            walletType === WalletType.MNEMONIC_PRIVATE_KEY ? (
            <StepImportWallet />
          ) : (
            <StepConnectHardwareWallet />
          )}

          {walletType === WalletType.HD && <StepRememberMnemonic />}

          <StepAddWalletDone />
        </ActionWizard>
      </Container>
    </>
  )
}
