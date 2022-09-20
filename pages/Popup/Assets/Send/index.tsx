import {
  Button,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Text
} from '@chakra-ui/react'
import Decimal from 'decimal.js'
import { atom } from 'jotai'
import { useState } from 'react'
import { BiQuestionMark } from 'react-icons/bi'
import { IoSwapVertical } from 'react-icons/io5'

import { useActive } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { useBalance } from '~lib/services/provider'
import { checkAddress } from '~lib/wallet'
import { useModalBox } from '~pages/Popup/ModalBox'

const isOpenAtom = atom<boolean>(false)

export function useSendModal() {
  return useModalBox(isOpenAtom)
}

export const Send = ({ onClose }: { onClose: () => void }) => {
  const { network, account } = useActive()
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')

  const balance = useBalance(network, account)
  const price = useCryptoComparePrice(balance?.symbol)

  const tokenUrl = price?.imageUrl

  if (!network) {
    return <></>
  }

  return (
    <Stack h="full" px={4} pt={2} pb={4} justify="space-between">
      <Stack spacing={12}>
        <Text textAlign="center" fontSize="3xl" fontWeight="medium">
          Send
        </Text>

        <Stack spacing={4}>
          <Input
            size="lg"
            placeholder="Recipient address"
            errorBorderColor="red.500"
            isInvalid={!!address && !checkAddress(network?.kind, address)}
            value={address}
            onChange={(e) => {
              setAddress(e.target.value)
            }}
          />

          <Stack>
            <InputGroup size="lg">
              <Input
                placeholder="0.0"
                errorBorderColor="red.500"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                }}
              />
              <InputRightElement>
                <IconButton
                  variant="ghost"
                  minW="30px"
                  w="30px"
                  h="30px"
                  aria-label="Show token select modal"
                  borderRadius="full"
                  icon={
                    <Image
                      borderRadius="full"
                      boxSize="20px"
                      fit="cover"
                      src={tokenUrl}
                      fallback={<Icon as={BiQuestionMark} fontSize="xl" />}
                      alt="Token Logo"
                    />
                  }
                />
              </InputRightElement>
            </InputGroup>

            <HStack justify="space-between" color="gray.500">
              <HStack cursor="pointer" onClick={() => {}}>
                <Text>
                  {price && (
                    <>
                      {price.currencySymbol}&nbsp;
                      {formatNumber(
                        new Decimal(price.price || 0).mul(balance?.amount || 0)
                      )}
                    </>
                  )}
                </Text>

                <Icon as={IoSwapVertical} />
              </HStack>
              <Text cursor="pointer" onClick={() => {}}>
                Balance: {formatNumber(balance?.amount)} {balance?.symbol}
              </Text>
            </HStack>
          </Stack>
        </Stack>
      </Stack>

      <HStack spacing={4}>
        <Button variant="outline" size="lg" flex={1} onClick={onClose}>
          Cancel
        </Button>
        <Button
          colorScheme="purple"
          size="lg"
          flex={1}
          onClick={() => {
            onClose()
          }}>
          Next
        </Button>
      </HStack>
    </Stack>
  )
}
