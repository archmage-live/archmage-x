import { ChevronLeftIcon } from '@chakra-ui/icons'
import {
  Box,
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
import { useCallback, useEffect, useState } from 'react'
import * as React from 'react'
import { BiQuestionMark } from 'react-icons/bi'
import { IoSwapVertical } from 'react-icons/io5'

import { AlertBox } from '~components/AlertBox'
import { useActive } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import {
  useBalance,
  useEstimateGasFee,
  useIsContract
} from '~lib/services/provider'
import { checkAddress } from '~lib/wallet'
import { useModalBox } from '~pages/Popup/ModalBox'

const isOpenAtom = atom<boolean>(false)

export function useSendModal() {
  return useModalBox(isOpenAtom)
}

export const Send = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const { network, account } = useActive()

  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')

  const balance = useBalance(network, account)
  const price = useCryptoComparePrice(balance?.symbol)

  const tokenUrl = price?.imageUrl

  const gasFee = useEstimateGasFee(network, account, isOpen ? 10000 : undefined)

  const [addrAlert, setAddrAlert] = useState('')
  const [amountAlert, setAmountAlert] = useState('')
  const [ignoreContract, setIgnoreContract] = useState(false)
  const [nextEnabled, setNextEnabled] = useState(false)

  useEffect(() => {
    setAddress('')
    setAmount('')
    setIgnoreContract(false)
    setNextEnabled(false)
  }, [isOpen, network, account])

  useEffect(() => {
    setAddrAlert('')
  }, [address])

  const isContract = useIsContract(
    network,
    (network && checkAddress(network.kind, address)) || undefined
  )

  const checkAddr = useCallback(() => {
    if (!!address && !checkAddress(network!.kind, address)) {
      setAddrAlert('Invalid address')
      return false
    } else {
      setAddrAlert('')
      return !!address
    }
  }, [network, address])

  useEffect(() => {
    setAmountAlert('')
  }, [amount])

  const checkPrecondition = useCallback(() => {
    if (!gasFee) {
      setAmountAlert('Gas price estimation failed due to network error')
      return false
    }
    if (!balance) {
      setAmountAlert('Get balance failed due to network error')
      return false
    }
    return true
  }, [balance, gasFee])

  const checkAmount = useCallback(() => {
    if (!amount) {
      setAmountAlert('')
      return false
    }

    if (Number.isNaN(+amount)) {
      setAmountAlert('Invalid amount')
      return false
    }

    if (!checkPrecondition()) {
      return false
    }

    const amt = new Decimal(amount).mul(new Decimal(10).pow(balance!.decimals))
    const value = amt.add(gasFee!)
    if (amt.gt(balance!.amountParticle)) {
      setAmountAlert('Insufficient balance')
      return false
    }
    if (value.gt(balance!.amountParticle)) {
      setAmountAlert('Insufficient funds for gas')
      return false
    }

    setAmountAlert('')
    return true
  }, [amount, balance, gasFee, checkPrecondition])

  const check = useCallback(
    (ignore?: boolean) => {
      const enabled = checkAddr() && checkAmount()
      setNextEnabled(enabled && (!isContract || ignoreContract || !!ignore))
      return enabled
    },
    [checkAddr, checkAmount, ignoreContract, isContract]
  )

  const setMaxAmount = useCallback(() => {
    if (!checkPrecondition()) {
      return false
    }

    const amount = new Decimal(balance!.amountParticle)
      .sub(gasFee!)
      .div(new Decimal(10).pow(balance!.decimals))
      .toSignificantDigits(9)

    if (amount.lte(0)) {
      setAmountAlert('Insufficient funds for gas')
      return
    }

    setAmount(amount.toString())
  }, [balance, gasFee, checkPrecondition])

  const onNext = useCallback(() => {
    if (!check()) {
      return
    }
  }, [check])

  if (!network) {
    return <></>
  }

  return (
    <Stack h="full" px={4} pt={2} pb={4} justify="space-between">
      <Stack spacing={12}>
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
            Send
          </Text>

          <Box w={10}></Box>
        </HStack>

        <Stack spacing={8}>
          <Input
            size="lg"
            placeholder="Recipient address"
            errorBorderColor="red.500"
            isInvalid={!!addrAlert}
            onBlur={() => check()}
            value={address}
            onChange={(e) => {
              setAddress(e.target.value)
            }}
          />

          <Stack>
            <InputGroup size="lg">
              <Input
                type="number"
                placeholder="0.0"
                errorBorderColor="red.500"
                isInvalid={!!amountAlert}
                onBlur={() => check()}
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
              <Text cursor="pointer" onClick={setMaxAmount}>
                Balance: {formatNumber(balance?.amount)} {balance?.symbol}
              </Text>
            </HStack>
          </Stack>

          <Stack>
            {isContract && !ignoreContract && (
              <AlertBox nowrap>
                <Text>
                  Warning: you are about to send to a token contract which could
                  result in a loss of funds.
                </Text>
                <Text
                  color="purple.500"
                  fontWeight="medium"
                  cursor="pointer"
                  onClick={() => {
                    setIgnoreContract(true)
                    check(true)
                  }}>
                  I understand
                </Text>
              </AlertBox>
            )}
            <AlertBox>{addrAlert}</AlertBox>
            <AlertBox>{amountAlert}</AlertBox>
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
          isDisabled={!nextEnabled}
          onClick={onNext}>
          Next
        </Button>
      </HStack>
    </Stack>
  )
}
