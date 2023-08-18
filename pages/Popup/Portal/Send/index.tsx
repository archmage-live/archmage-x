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
  Text,
  useDisclosure
} from '@chakra-ui/react'
import { hexlify } from '@ethersproject/bytes'
import { BiQuestionMark } from '@react-icons/all-files/bi/BiQuestionMark'
import { IoSwapVertical } from '@react-icons/all-files/io5/IoSwapVertical'
import { BCS, Types } from 'aptos'
import { APTOS_COIN } from 'aptos/src/utils'
import assert from 'assert'
import Decimal from 'decimal.js'
import { atom, useAtom } from 'jotai'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAsync, useInterval } from 'react-use'

import { AlertBox } from '~components/AlertBox'
import { useActive } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { NetworkKind } from '~lib/network'
import { ERC20__factory } from '~lib/network/evm/abi'
import { IChainAccount, INetwork, IToken } from '~lib/schema'
import { CONSENT_SERVICE, ConsentType } from '~lib/services/consentService'
import { useCoinGeckoTokenPrice } from '~lib/services/datasource/coingecko'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import {
  Provider,
  addressZero,
  useBalance,
  useEstimateGasFee,
  useIsContract,
  useProvider
} from '~lib/services/provider'
import { EvmProvider } from '~lib/services/provider/evm/provider'
import { EvmTxParams } from '~lib/services/provider/evm/types'
import { NativeToken, getTokenBrief, useTokenById } from '~lib/services/token'
import { canWalletSign, checkAddress } from '~lib/wallet'
import { TokenItem, TokenItemStyle } from '~pages/Popup/Portal/TokenItem'
import { useConsentModal } from '~pages/Popup/Consent'
import { useModalBox } from '~pages/Popup/ModalBox'

import { SelectTokenModal } from './SelectTokenModal'

const isOpenAtom = atom<boolean>(false)

export function useSendModal() {
  return useModalBox(isOpenAtom)
}

const tokenIdAtom = atom<number | undefined>(undefined)

export function useSendTokenId() {
  return useAtom(tokenIdAtom)
}

export const Send = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const { onOpen: onConsentOpen } = useConsentModal()

  const { network, wallet, account } = useActive()

  useEffect(() => {
    onClose()
  }, [network, onClose])

  const [tokenId, setTokenId] = useSendTokenId()

  const { nativeToken, balance, price, iconUrl, token } = useTokenInfo(
    network,
    account,
    tokenId
  )

  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [isQuote, setIsQuote] = useState(false)

  const tx = useBuildSendTx(network, account, token)
  const gasFee = useEstimateGasFee(
    network,
    account,
    tx,
    isOpen ? 10000 : undefined
  )

  const [addrAlert, setAddrAlert] = useState('')
  const [amountAlert, setAmountAlert] = useState('')
  const [ignoreContract, setIgnoreContract] = useState(false)
  const [nextEnabled, setNextEnabled] = useState(false)

  useEffect(() => {
    setAddress('')
    setAmountInput('')
    setIsQuote(false)
    setAddrAlert('')
    setAmountAlert('')
    setIgnoreContract(false)
    setNextEnabled(false)
  }, [isOpen, network, account])

  useEffect(() => {
    setAmountInput('')
    setAmountAlert('')
  }, [tokenId])

  useEffect(() => {
    if (!isQuote) {
      setAmount(amountInput)
    } else {
      setAmount(
        new Decimal(amountInput || 0)
          .div(price?.price || 1)
          .toDecimalPlaces(9, Decimal.ROUND_FLOOR)
          .toString()
      )
    }
  }, [amountInput, isQuote, price])

  const toggleIsQuote = useCallback(() => {
    const useQuote = !isQuote
    if (useQuote) {
      setAmountInput(
        new Decimal(amountInput || 0)
          .mul(price?.price || 0)
          .toDecimalPlaces(9, Decimal.ROUND_FLOOR)
          .toString()
      )
    } else {
      setAmountInput(
        new Decimal(amountInput || 0)
          .div(price?.price || 1)
          .toDecimalPlaces(9, Decimal.ROUND_FLOOR)
          .toString()
      )
    }
    setIsQuote(useQuote)
  }, [amountInput, isQuote, price])

  const isContract = useIsContract(
    network,
    (network && checkAddress(network.kind, address)) || undefined
  )

  const checkAddr = useCallback(() => {
    const addr = address.trim()
    if (addr !== address) {
      setAddress(addr)
    }
    if (!!addr && !checkAddress(network!.kind, addr)) {
      setAddrAlert('Invalid address')
      return false
    } else {
      setAddrAlert('')
      return !!addr
    }
  }, [network, address])

  const checkPrecondition = useCallback(() => {
    if (!gasFee) {
      setAmountAlert('Gas price estimation failed due to network error')
      return false
    }
    if (!nativeToken || !balance) {
      setAmountAlert('Get balance failed due to network error')
      return false
    }
    return true
  }, [nativeToken, balance, gasFee])

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
    if (amt.gt(balance!.amountParticle)) {
      setAmountAlert('Insufficient balance')
      return false
    }

    if (tokenId === undefined) {
      if (amt.add(gasFee!).gt(balance!.amountParticle)) {
        setAmountAlert('Insufficient funds for gas')
        return false
      }
    } else {
      if (new Decimal(gasFee!).gt(nativeToken!.balance.amountParticle)) {
        setAmountAlert('Insufficient funds for gas')
        return false
      }
    }

    setAmountAlert('')
    return true
  }, [amount, checkPrecondition, balance, tokenId, gasFee, nativeToken])

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

    let amount = new Decimal(balance!.amountParticle)
    if (tokenId === undefined) {
      amount = amount.sub(gasFee!)
    }
    amount = amount
      .div(new Decimal(10).pow(balance!.decimals))
      .toDecimalPlaces(9, Decimal.ROUND_FLOOR)

    if (amount.lte(0)) {
      setAmountInput('')
      if (tokenId === undefined) {
        setAmountAlert('Insufficient funds for gas')
      } else {
        setAmountAlert('Insufficient balance')
      }
      return
    }

    if (!isQuote) {
      setAmountInput(amount.toString())
    } else {
      setAmountInput(
        amount
          .mul(price?.price || 0)
          .toDecimalPlaces(9, Decimal.ROUND_FLOOR)
          .toString()
      )
    }
    setAmountAlert('')
  }, [checkPrecondition, balance, tokenId, isQuote, gasFee, price])

  useInterval(check, 1000)

  const provider = useProvider(network)

  const [isLoading, setIsLoading] = useState(false)

  const onNext = useCallback(async () => {
    if (!check()) {
      return
    }

    if (!network || !account?.address || !provider) {
      return
    }

    const amt = new Decimal(amount)
      .mul(new Decimal(10).pow(balance!.decimals))
      .toDecimalPlaces(0)
      .toString()

    assert(tokenId === undefined || !!token)
    let params = await buildSendTx(
      network,
      provider,
      account,
      address,
      amt,
      token
    )
    if (!params) {
      return
    }

    setIsLoading(true)

    const txPayload = await provider.populateTransaction(account, params)

    if (network.kind === NetworkKind.APTOS) {
      const serializer = new BCS.Serializer()
      txPayload.txParams.serialize(serializer)
      txPayload.txParams = hexlify(serializer.getBytes())
    }

    await CONSENT_SERVICE.requestConsent(
      {
        networkId: network.id,
        accountId: account.id,
        type: ConsentType.TRANSACTION,
        payload: txPayload
      },
      undefined,
      false
    )

    onConsentOpen()

    setIsLoading(false)
  }, [
    check,
    network,
    account,
    provider,
    token,
    amount,
    balance,
    onConsentOpen,
    tokenId,
    address
  ])

  const {
    isOpen: isSelectTokenOpen,
    onOpen: onSelectTokenOpen,
    onClose: onSelectTokenClose
  } = useDisclosure()

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

        <Stack px={2} spacing={8}>
          <Input
            size="lg"
            placeholder="Recipient address"
            errorBorderColor="red.500"
            isInvalid={!!addrAlert}
            value={address}
            onChange={(e) => {
              setAddrAlert('')
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
                min={Number.MIN_VALUE}
                max={Number.MAX_VALUE}
                step={Number.MAX_VALUE}
                value={amountInput}
                onChange={(e) => {
                  setAmountAlert('')
                  setAmountInput(e.target.value)
                }}
              />
              <InputRightElement zIndex={0}>
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
                      src={iconUrl}
                      fallback={<Icon as={BiQuestionMark} fontSize="xl" />}
                      alt="Token Logo"
                    />
                  }
                  onClick={onSelectTokenOpen}
                />
              </InputRightElement>
            </InputGroup>

            <HStack
              justify="space-between"
              align="start"
              color="gray.500"
              userSelect="none">
              <HStack
                cursor="pointer"
                onClick={() => price?.price !== undefined && toggleIsQuote()}>
                {price?.price !== undefined && (
                  <>
                    <Text>
                      {!isQuote ? (
                        <>
                          {price.currencySymbol}
                          {formatNumber(
                            new Decimal(price.price).mul(amount || 0)
                          )}
                        </>
                      ) : (
                        <>
                          {formatNumber(amount)} {balance?.symbol}
                        </>
                      )}
                    </Text>

                    <Icon as={IoSwapVertical} />
                  </>
                )}
              </HStack>
              <Text cursor="pointer" onClick={setMaxAmount}>
                Balance:&nbsp;
                {!isQuote ? (
                  <>
                    {formatNumber(balance?.amount)} {balance?.symbol}
                  </>
                ) : (
                  <>
                    {price?.currencySymbol}
                    {formatNumber(
                      new Decimal(price?.price || 0).mul(balance?.amount || 0)
                    )}
                  </>
                )}
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

            {wallet && !canWalletSign(wallet.type) && (
              <AlertBox level="error">
                You can&apos;t send tokens using the watch-only wallet.
              </AlertBox>
            )}
          </Stack>
        </Stack>
      </Stack>

      <HStack px={2} spacing={4}>
        <Button variant="outline" size="lg" flex={1} onClick={onClose}>
          Cancel
        </Button>
        <Button
          colorScheme="purple"
          size="lg"
          flex={1}
          isDisabled={!nextEnabled || (wallet && !canWalletSign(wallet.type))}
          isLoading={isLoading}
          onClick={onNext}>
          Next
        </Button>
      </HStack>

      <SelectTokenModal
        isOpen={isSelectTokenOpen}
        onClose={onSelectTokenClose}
        onSelect={(token) => setTokenId(token.id)}
        nativeTokenItem={
          nativeToken && (
            <TokenItem
              nativeToken={nativeToken}
              style={TokenItemStyle.DISPLAY_WITH_PRICE}
              currencySymbol={price?.currencySymbol}
              price={price?.price}
              change24Hour={price?.change24Hour}
              onClick={() => {
                setTokenId(undefined)
                onSelectTokenClose()
              }}
            />
          )
        }
      />
    </Stack>
  )
}

interface TokenPrice {
  currencySymbol: string | undefined
  price?: number | undefined
  change24Hour?: number | undefined
}

function useTokenInfo(
  network?: INetwork,
  account?: IChainAccount,
  tokenId?: number
) {
  const nativeBalance = useBalance(network, account)
  const nativePrice = useCryptoComparePrice(nativeBalance?.symbol)

  const token = useTokenById(tokenId)

  const tokenPrice = useCoinGeckoTokenPrice(network, token)

  const nativeToken = useMemo(
    () =>
      network &&
      nativeBalance &&
      ({
        network,
        balance: nativeBalance,
        iconUrl: nativePrice?.imageUrl
      } as NativeToken),
    [network, nativeBalance, nativePrice]
  )

  const [balance, price, iconUrl] = useMemo(() => {
    if (typeof tokenId !== 'number') {
      // native
      const change24Hour = nativePrice?.change24Hour
      return [
        nativeBalance,
        nativePrice &&
          ({
            ...nativePrice,
            change24Hour:
              change24Hour !== undefined ? change24Hour * 100 : undefined
          } as TokenPrice | undefined),
        nativePrice?.imageUrl
      ]
    } else {
      // token
      if (!token) {
        return []
      }
      const brief = getTokenBrief(token)
      return [
        brief.balance,
        tokenPrice as TokenPrice | undefined,
        brief.iconUrl
      ]
    }
  }, [nativeBalance, nativePrice, token, tokenId, tokenPrice])

  return {
    nativeToken,
    balance,
    price,
    iconUrl,
    token
  }
}

function useBuildSendTx(
  network?: INetwork,
  account?: IChainAccount,
  token?: IToken,
  to?: string,
  amount?: string | number
) {
  const provider = useProvider(network)

  const { value } = useAsync(async () => {
    if (!network || !provider || !account) {
      return
    }

    to = to ? to : addressZero(network)
    amount = amount ? amount : 0

    return buildSendTx(network, provider, account, to, amount, token)
  }, [network, account, token, to, amount, provider])

  return value
}

async function buildSendTx(
  network: INetwork,
  provider: Provider,
  account: IChainAccount,
  to: string,
  amount: string | number,
  token?: IToken
) {
  switch (network.kind) {
    case NetworkKind.EVM: {
      if (!token) {
        return {
          from: account.address,
          to,
          value: amount
        } as EvmTxParams
      } else {
        const tokenContract = ERC20__factory.connect(
          token.token,
          (provider as EvmProvider).provider
        )
        return await tokenContract.populateTransaction.transfer(to, amount)
      }
    }
    case NetworkKind.APTOS: {
      if (!token) {
        // return new CoinClient(
        //   (provider as AptosProvider).client
        // ).transactionBuilder.buildTransactionPayload(
        //   '0x1::coin::transfer',
        //   [APTOS_COIN],
        //   [to, amount]
        // )
        return {
          type: 'entry_function_payload',
          function: '0x1::aptos_account::transfer', // or '0x1::coin::transfer'
          type_arguments: [], // or [APTOS_COIN]
          arguments: [to, amount]
        } as Types.TransactionPayload_EntryFunctionPayload
      } else {
        // TODO
        return
      }
    }
    default:
      return
  }
}
