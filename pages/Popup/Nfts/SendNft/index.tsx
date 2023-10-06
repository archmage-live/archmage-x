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
import { atom, useAtom } from 'jotai'
import { useCallback, useState } from 'react'

import { AlertBox } from '~components/AlertBox'
import { useActive } from '~lib/active'
import { NetworkKind } from '~lib/network'
import { IChainAccount, INetwork, INft } from '~lib/schema'
import { useNft } from '~lib/services/nft'
import { Provider, useIsContract } from '~lib/services/provider'
import { canWalletSign, checkAddress } from '~lib/wallet'
import { useModalBox } from '~pages/Popup/ModalBox'
import { NftItem } from '~pages/Popup/Nfts/NftItem'

import { buildSendNftEthTx } from './sendNftEth'

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
  const [nftId] = useSendNftId()

  const nft = useNft(nftId)

  const { network, wallet, account } = useActive()

  const [address, setAddress] = useState('')

  const [addrAlert, setAddrAlert] = useState('')
  const [ignoreContract, setIgnoreContract] = useState(false)
  const [nextEnabled, setNextEnabled] = useState(false)

  // whether the address is a contract address
  const isContract = useIsContract(
    network,
    (network && checkAddress(network.kind, address)) || undefined
  )

  const check = useCallback((ignore?: boolean) => {}, [])

  const [isLoading, setIsLoading] = useState(false)

  const onNext = useCallback(async () => {}, [])

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
