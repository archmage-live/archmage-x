import { Button, Stack, Text } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { IToken, TokenVisibility } from '~lib/schema'
import { TOKEN_SERVICE } from '~lib/services/token'
import { TokenItem, TokenItemStyle } from '~pages/Popup/Portal/TokenItem'

import { useManageTokensTitleAtom } from '.'

export const ImportToken = ({ token }: { token?: IToken }) => {
  const [, setTitle] = useManageTokensTitleAtom()
  useEffect(() => {
    setTitle('Import Token')
  }, [setTitle])

  const { previousStep } = useWizard()

  if (!token) {
    return <></>
  }

  return (
    <Stack spacing={8} pt={8}>
      <TokenItem token={token} style={TokenItemStyle.DISPLAY} />

      <AlertBox level="error" nowrap>
        <Text fontSize="xl" textAlign="center">
          Import at your own risk
        </Text>
        <Text mt={4}>
          This token does not appear on the active token list(s). Make sure this
          is the token that you want to import.
        </Text>
      </AlertBox>

      <Button
        size="lg"
        colorScheme="purple"
        onClick={async () => {
          token.visible = TokenVisibility.SHOW
          await TOKEN_SERVICE.addToken(token)
          await previousStep()
        }}>
        Import
      </Button>
    </Stack>
  )
}
