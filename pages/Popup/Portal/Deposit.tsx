import { ChevronLeftIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  IconButton,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { atom } from 'jotai'
import { QRCodeSVG } from 'qrcode.react'
import * as React from 'react'
import browser from 'webextension-polyfill'

import { AlertBox } from '~components/AlertBox'
import { CopyArea } from '~components/CopyIcon'
import { useActive } from '~lib/active'
import {
  getBridgeUrl,
  getFaucetUrl,
  getNetworkInfo
} from '~lib/services/network'
import { canWalletSign } from '~lib/wallet'
import { useModalBox } from '~pages/Popup/ModalBox'

const isOpenAtom = atom<boolean>(false)

export function useDepositModal() {
  return useModalBox(isOpenAtom)
}

export const Deposit = ({ onClose }: { onClose: () => void }) => {
  const { network, wallet, account } = useActive()

  const qrCodeBg = useColorModeValue('white', 'black')
  const qrCodeFg = useColorModeValue('black', 'white')

  const faucet = network && getFaucetUrl(network)

  const bridge = network && getBridgeUrl(network)

  if (!network || !account) {
    return <></>
  }

  return (
    <Stack h="full" px={4} pt={2} pb={4} justify="space-between">
      <Stack>
        <Stack spacing={20}>
          <HStack justify="space-between" minH={16}>
            <IconButton
              icon={<ChevronLeftIcon fontSize="2xl" />}
              aria-label="Close"
              variant="ghost"
              borderRadius="full"
              size="sm"
              onClick={onClose}
            />

            <Text textAlign="center" fontSize="3xl" fontWeight="medium">
              Deposit
            </Text>

            <Box w={10}></Box>
          </HStack>

          {account.address && (
            <Stack align="center" spacing={6}>
              <QRCodeSVG
                value={account.address}
                size={144}
                bgColor={qrCodeBg}
                fgColor={qrCodeFg}
                level={'L'}
                includeMargin={false}
              />

              <CopyArea
                name="Address"
                copy={account.address}
                props={{ w: 64 }}
              />

              {wallet && !canWalletSign(wallet.type) ? (
                <AlertBox level="error">
                  Don&apos;t use this watch-only wallet to receive tokens.
                  Otherwise you may lose your assets.
                </AlertBox>
              ) : (
                <Text color="gray.500" textAlign="center">
                  This address can be used to receive tokens on&nbsp;
                  {getNetworkInfo(network).name}.
                </Text>
              )}
            </Stack>
          )}
        </Stack>
      </Stack>

      <Stack>
        {faucet && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              browser.tabs.create({ url: faucet }).then()
            }}>
            Get tokens from faucet
          </Button>
        )}
        {bridge && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              browser.tabs.create({ url: bridge }).then()
            }}>
            Bridge funds
          </Button>
        )}
      </Stack>

      <Button variant="outline" size="lg" onClick={onClose}>
        Close
      </Button>
    </Stack>
  )
}
