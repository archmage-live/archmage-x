import { Button, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { atom } from 'jotai'
import { QRCodeSVG } from 'qrcode.react'

import { CopyArea } from '~components/CopyIcon'
import { useActive } from '~lib/active'
import { useModalBox } from '~pages/Popup/ModalBox'

const isOpenAtom = atom<boolean>(false)

export function useDepositModal() {
  return useModalBox(isOpenAtom)
}

export const Deposit = ({ onClose }: { onClose: () => void }) => {
  const { account } = useActive()

  const qrCodeBg = useColorModeValue('white', 'black')
  const qrCodeFg = useColorModeValue('black', 'white')

  if (!account?.address) {
    return <></>
  }

  return (
    <Stack h="full" px={4} pt={2} pb={4} justify="space-between">
      <Stack>
        <Stack spacing={12}>
          <Text textAlign="center" fontSize="3xl" fontWeight="medium">
            Deposit
          </Text>

          <Stack align="center" spacing={6}>
            <QRCodeSVG
              value={account.address}
              size={144}
              bgColor={qrCodeBg}
              fgColor={qrCodeFg}
              level={'L'}
              includeMargin={false}
            />

            <CopyArea name="Address" copy={account.address} props={{ w: 64 }} />
          </Stack>
        </Stack>
      </Stack>

      <Button variant="outline" size="lg" onClick={onClose}>
        Close
      </Button>
    </Stack>
  )
}
