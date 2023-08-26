import {
  Box,
  Button,
  Divider,
  HStack,
  Icon,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text
} from '@chakra-ui/react'
import { MdOutlineRocketLaunch } from '@react-icons/all-files/md/MdOutlineRocketLaunch'
import { useCallback, useState } from 'react'
import { useAsyncRetry, useInterval } from 'react-use'
import { CallData, hash } from 'starknet'

import { NetworkKind } from '~lib/network'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { getStarknetClient } from '~lib/services/provider/starknet/client'
import { StarknetPermissionedProvider } from '~lib/services/provider/starknet/permissionedProvider'
import { StarknetProvider } from '~lib/services/provider/starknet/provider'
import { canWalletSign, getSigningWallet } from '~lib/wallet'
import {
  ARGENT_ACCOUNT_CONTRACT_CLASS_HASHES,
  ARGENT_PROXY_CONTRACT_CLASS_HASHES
} from '~lib/wallet/starknet'
import { useConsentModal } from '~pages/Popup/Consent'

export const AccountAbstractionPopover = ({
  network,
  wallet,
  subWallet,
  account
}: {
  network?: INetwork
  wallet?: IWallet
  subWallet?: ISubWallet
  account?: IChainAccount
}) => {
  const {
    value: info,
    loading,
    error,
    retry
  } = useAsyncRetry(async () => {
    if (!network || !wallet || !subWallet || !account?.address) {
      return
    }
    if (!canWalletSign(wallet.type)) {
      return
    }

    if (wallet.info.accountAbstraction) {
      // TODO
      return
    }

    if (network.kind === NetworkKind.STARKNET) {
      const client = await StarknetProvider.from(network)
      const isDeployed = (await client.getNextNonce(account)) > 0
      const balance = await client.getBalance(account)
      const isFunded =
        balance !== undefined ? Number(balance) > 0.0001 : undefined // TODO
      return {
        isDeployed,
        isFunded
      }
    }
  }, [network, wallet, subWallet, account])

  useInterval(retry, !loading && error ? 30000 : null)

  const { onOpen: onConsentOpen } = useConsentModal()

  const [isLoading, setIsLoading] = useState(false)

  const deployAccount = useCallback(async () => {
    if (!network || !wallet || !subWallet || !account?.address) {
      return
    }

    setIsLoading(true)

    const client = await getStarknetClient(network)
    const signer = await getSigningWallet(account)
    if (!signer) {
      setIsLoading(false)
      return
    }

    const contractClassHash = ARGENT_PROXY_CONTRACT_CLASS_HASHES[0]
    const accountClassHash = ARGENT_ACCOUNT_CONTRACT_CLASS_HASHES[0]

    const provider = new StarknetPermissionedProvider(network, client, '')
    provider.accounts = [account]
    provider.account = account

    await provider.deployAccount(
      undefined,
      {
        classHash: contractClassHash,
        constructorCalldata: {
          implementation: accountClassHash,
          selector: hash.getSelectorFromName('initialize'),
          calldata: CallData.compile({
            signer: signer.publicKey!,
            guardian: '0'
          })
        },
        addressSalt: signer.publicKey!,
        contractAddress: account.address
      },
      undefined,
      false
    )

    onConsentOpen()

    setIsLoading(false)
  }, [network, subWallet, wallet, account, onConsentOpen])

  return info?.isDeployed === false ? (
    <Popover isLazy trigger="hover" placement="bottom-end">
      <PopoverTrigger>
        <Box>
          <Icon boxSize="20px" as={MdOutlineRocketLaunch} cursor="pointer" />
        </Box>
      </PopoverTrigger>
      <PopoverContent w="auto">
        <PopoverArrow />
        <PopoverBody>
          <HStack h={8} spacing={4} justify="end">
            <Text fontWeight="medium" color="purple.500">
              AA
            </Text>
            <Divider orientation="vertical" />
            {info.isFunded === false ? (
              <Text color="gray.500">Please fund your account</Text>
            ) : (
              <Button
                colorScheme="gray"
                onClick={deployAccount}
                isLoading={isLoading}>
                Deploy
              </Button>
            )}
          </HStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  ) : (
    <></>
  )
}
