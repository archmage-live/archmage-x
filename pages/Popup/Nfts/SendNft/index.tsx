import { ChevronLeftIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  HStack,
  IconButton,
  Input,
  Stack,
  Text
} from '@chakra-ui/react'
import Decimal from 'decimal.js'
import { atom, useAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import * as React from 'react'
import { useAsync, useInterval } from 'react-use'

import { AlertBox } from '~components/AlertBox'
import { useActive } from '~lib/active'
import { NetworkKind } from '~lib/network'
import { IChainAccount, INetwork, INft } from '~lib/schema'
import { CONSENT_SERVICE, ConsentType } from '~lib/services/consentService'
import { useNft } from '~lib/services/nft'
import {
  Provider,
  compactTxPayload,
  useBalance,
  useEstimateGasFee,
  useIsContract,
  useProvider
} from '~lib/services/provider'
import { canWalletSign, checkAddress } from '~lib/wallet'
import { useConsentModal } from '~pages/Popup/Consent'
import { NftItem } from '~pages/Popup/Nfts/NftItem'

import { buildSendNftEthTx } from './sendNftEth'
import { useModalBox } from "~components/ModalBox";

const isOpenAtom = atom<boolean>(false)

export function useSendNftModal() {
  return useModalBox(isOpenAtom)
}

const nftIdAtom = atom<number | undefined>(undefined)

export function useSendNftId() {
  return useAtom(nftIdAtom)
}

export const SendNft = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const { onOpen: onConsentOpen } = useConsentModal()

  const [nftId] = useSendNftId()

  const nft = useNft(nftId)

  const { network, wallet, account } = useActive()

  useEffect(() => {
    onClose()
  }, [network, onClose])

  const provider = useProvider(network)

  const balance = useBalance(network, account)

  const [address, setAddress] = useState('')

  const [addrAlert, setAddrAlert] = useState('')
  const [feeAlert, setFeeAlert] = useState('')
  const [ignoreContract, setIgnoreContract] = useState(false)
  const [nextEnabled, setNextEnabled] = useState(false)

  // reset
  useEffect(() => {
    setAddress('')
    setAddrAlert('')
    setFeeAlert('')
    setIgnoreContract(false)
    setNextEnabled(false)
  }, [isOpen, network, account])

  // whether the address is a contract address
  const isContract = useIsContract(
    network,
    (network && checkAddress(network.kind, address)) || undefined
  )

  const tx = useBuildSendNftTx(
    network,
    provider,
    account,
    nft,
    (network && checkAddress(network.kind, address)) || undefined
  )
  const gasFee = useEstimateGasFee(
    network,
    account,
    tx,
    isOpen ? 10000 : undefined
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

  const checkAmount = useCallback(() => {
    if (!gasFee) {
      setFeeAlert('Gas price estimation failed due to network error')
      return false
    }
    if (!balance) {
      setFeeAlert('Get balance failed due to network error')
      return false
    }

    if (new Decimal(gasFee).gt(balance.amountParticle)) {
      setFeeAlert('Insufficient funds for gas')
      return false
    }

    setFeeAlert('')
    return true
  }, [balance, gasFee])

  const check = useCallback(
    (ignore?: boolean) => {
      const enabled = checkAddr() && checkAmount()
      setNextEnabled(enabled && (!isContract || ignoreContract || !!ignore))
      return enabled
    },
    [checkAddr, checkAmount, ignoreContract, isContract]
  )

  useInterval(check, 1000)

  const [isLoading, setIsLoading] = useState(false)

  const onNext = useCallback(async () => {
    if (!check()) {
      return
    }

    if (!network || !provider || !account?.address || !nft) {
      return
    }

    setIsLoading(true)

    const params = await buildSendNftTx(
      network,
      provider,
      account,
      address,
      nft
    )
    if (!params) {
      // TODO: alert
      setIsLoading(false)
      return
    }

    const txPayload = await provider.populateTransaction(account, params)

    await CONSENT_SERVICE.requestConsent(
      {
        networkId: network.id,
        accountId: account.id,
        type: ConsentType.TRANSACTION,
        payload: compactTxPayload(network, txPayload)
      },
      undefined,
      false
    )

    onConsentOpen()

    setIsLoading(false)
  }, [network, provider, account, nft, address, check, onConsentOpen])

  if (!nft) {
    return <></>
  }

  return (
    <Stack
      h="full"
      overflowY="auto"
      px={6}
      pt={2}
      pb={4}
      justify="space-between">
      <Stack spacing={6}>
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
            Send NFT
          </Text>

          <Box w={10}></Box>
        </HStack>

        <Stack spacing={6}>
          <Center>
            <NftItem nft={nft} size="220px" noBalance />
          </Center>

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
        </Stack>

        <Stack>
          {isContract && !ignoreContract && (
            <AlertBox nowrap>
              <Text>
                Warning: you are about to send to a contract which could result
                in a loss of funds.
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

          <AlertBox>{feeAlert}</AlertBox>

          {wallet && !canWalletSign(wallet.type) && (
            <AlertBox level="error">
              You can&apos;t send NFT using the watch-only wallet.
            </AlertBox>
          )}
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
          isDisabled={!nextEnabled || (wallet && !canWalletSign(wallet.type))}
          isLoading={isLoading}
          onClick={onNext}>
          Next
        </Button>
      </HStack>
    </Stack>
  )
}

function useBuildSendNftTx(
  network?: INetwork,
  provider?: Provider,
  account?: IChainAccount,
  nft?: INft,
  to?: string
) {
  const { value } = useAsync(async () => {
    if (!network || !provider || !account || !nft || !to) {
      return
    }

    try {
      return await buildSendNftTx(network, provider, account, to, nft)
    } catch (err) {
      console.error(err)
    }
  }, [network, provider, account, nft, to])

  return value
}

export async function buildSendNftTx(
  network: INetwork,
  provider: Provider,
  account: IChainAccount,
  to: string,
  nft: INft
) {
  switch (network.kind) {
    case NetworkKind.EVM:
      return buildSendNftEthTx(provider, account, to, nft)
    default:
      return
  }
}
