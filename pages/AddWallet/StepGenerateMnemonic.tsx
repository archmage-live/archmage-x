import { Button, Checkbox, Stack, Text, chakra } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { MnemonicDisplay } from '~components/MnemonicDisplay'
import { WALLET_SERVICE } from '~lib/services/walletService'

import { useMnemonic } from './addWallet'

export const StepGenerateMnemonic = () => {
  const { nextStep } = useWizard()

  const [mnemonic, setMnemonic] = useMnemonic()
  const [isChecked, setIsChecked] = useState(false)

  useEffect(() => {
    const effect = async () => {
      if (!mnemonic.length) {
        setMnemonic((await WALLET_SERVICE.generateMnemonic()).split(' '))
      }
    }
    effect()
  }, [mnemonic, setMnemonic])

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
          This phrase is the ONLY way to recover your wallet. Do NOT share it
          with anyone!
        </Text>
      </Stack>

      <MnemonicDisplay mnemonic={mnemonic} />

      <Checkbox
        size="lg"
        colorScheme="purple"
        isChecked={isChecked}
        onChange={(e) => setIsChecked(e.target.checked)}>
        <chakra.span color="gray.500" fontSize="xl">
          I saved my Secret Recovery Phrase
        </chakra.span>
      </Checkbox>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        disabled={!isChecked}
        onClick={nextStep}>
        Continue
      </Button>
    </Stack>
  )
}
