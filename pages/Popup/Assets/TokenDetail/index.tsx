import { ChevronLeftIcon } from '@chakra-ui/icons'
import {
  Button,
  Center,
  HStack,
  Icon,
  IconButton,
  Image,
  Stack,
  Text,
  chakra,
  useColorModeValue
} from '@chakra-ui/react'
import Decimal from 'decimal.js'
import { atom, useAtom } from 'jotai'
import * as React from 'react'
import { BiQuestionMark } from 'react-icons/bi'

import { useActive, useActiveWallet } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { IToken } from '~lib/schema'
import { useCoinGeckoTokenPrice } from '~lib/services/datasource/coingecko'
import { useBalance } from '~lib/services/provider'
import { getTokenBrief } from '~lib/services/token'
import { AccountMenu } from '~pages/Popup/Assets/AccountMenu'
import { useDepositModal } from '~pages/Popup/Assets/Deposit'
import { useSendModal } from '~pages/Popup/Assets/Send'
import { useModalBox } from '~pages/Popup/ModalBox'

const isOpenAtom = atom<boolean>(false)
const tokenAtom = atom<IToken | undefined>(undefined)

export function useTokenDetailModal() {
  const modal = useModalBox(isOpenAtom)
  const [token, setToken] = useAtom(tokenAtom)
  return {
    ...modal,
    token,
    setToken
  }
}

export default function TokenDetail({ onClose }: { onClose: () => void }) {
  const { token } = useTokenDetailModal()

  const { network, wallet, subWallet, account } = useActive()

  const price = useCoinGeckoTokenPrice(network, token?.token)

  const { onOpen: onSendOpen } = useSendModal()
  const { onOpen: onDepositOpen } = useDepositModal()

  const btnColorScheme = useColorModeValue('purple', undefined)

  if (!token) {
    return <></>
  }

  const brief = getTokenBrief(token)

  return (
    <Stack h="full" px={4} pt={2} pb={4} spacing={6}>
      <HStack justify="space-between" minH={16}>
        <HStack>
          <IconButton
            icon={<ChevronLeftIcon fontSize="2xl" />}
            aria-label="Close"
            variant="ghost"
            borderRadius="full"
            size="sm"
            onClick={onClose}
          />

          <Text>
            {subWallet?.name ? subWallet.name : wallet?.name}&nbsp;/&nbsp;
            <chakra.span fontWeight="medium">{brief.name}</chakra.span>
          </Text>
        </HStack>

        <AccountMenu />
      </HStack>

      <HStack justify="center" minH={16}>
        <Stack spacing={2} align="center">
          <Image
            borderRadius="full"
            boxSize="30px"
            fit="cover"
            src={brief.iconUrl}
            fallback={
              <Center
                w="30px"
                h="30px"
                borderRadius="full"
                borderWidth="1px"
                borderColor="gray.500">
                <Icon as={BiQuestionMark} fontSize="3xl" />
              </Center>
            }
            alt="Token Logo"
          />

          <Stack spacing={0} align="center">
            <Text fontSize="4xl" fontWeight="medium">
              {formatNumber(brief.balance.amount)} {brief.balance.symbol}
            </Text>
            {price?.price && (
              <Text fontSize="xl" fontWeight="medium" color="gray.500">
                {price.currencySymbol}&nbsp;
                {formatNumber(
                  new Decimal(price.price || 0).mul(brief.balance.amount || 0)
                )}
              </Text>
            )}
          </Stack>
        </Stack>
      </HStack>

      <HStack justify="center" spacing={4}>
        <Button
          size="md"
          w={36}
          colorScheme={btnColorScheme}
          onClick={onDepositOpen}>
          Deposit
        </Button>
        <Button
          size="md"
          w={36}
          colorScheme={btnColorScheme}
          onClick={onSendOpen}>
          Send
        </Button>
      </HStack>
    </Stack>
  )
}
