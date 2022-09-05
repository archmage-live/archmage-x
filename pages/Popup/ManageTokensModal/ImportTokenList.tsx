import { Button, Checkbox, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { useActive } from '~lib/active'
import { ITokenList } from '~lib/schema'
import { TOKEN_SERVICE } from '~lib/services/token'

import { TokenListItem } from './TokenListItem'

export const ImportTokenList = ({
  setTitle,
  tokenList
}: {
  setTitle: (title: string) => void
  tokenList?: ITokenList
}) => {
  useEffect(() => {
    setTitle('Import List')
  }, [setTitle])

  const { network } = useActive()

  const [isChecked, setIsChecked] = useState(false)

  const { previousStep } = useWizard()

  if (!network || !tokenList) {
    return <></>
  }

  return (
    <Stack spacing={8} pt={8}>
      <TokenListItem
        network={network}
        tokenList={tokenList}
        undetermined="display"
      />

      <Stack spacing={6} align="center">
        <AlertBox level="error" nowrap>
          <Text fontSize="xl" textAlign="center">Import at your own risk</Text>
          <Text mt={4}>
            By adding this list you are implicitly trusting that the data is
            correct. Anyone can create a list, including creating fake versions
            of existing lists and lists that claim to represent projects that do
            not have one.
          </Text>
        </AlertBox>

        <Checkbox
          colorScheme="purple"
          isChecked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}>
          I understand
        </Checkbox>
      </Stack>

      <Button
        size="lg"
        colorScheme="purple"
        disabled={!isChecked}
        onClick={async () => {
          tokenList.enabled = true
          await TOKEN_SERVICE.addTokenList(tokenList)
          await previousStep()
        }}>
        Import
      </Button>
    </Stack>
  )
}
