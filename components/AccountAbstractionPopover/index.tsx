import { SettingsIcon } from '@chakra-ui/icons'
import {
  Box,
  Divider,
  HStack,
  Icon,
  IconButton,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure
} from '@chakra-ui/react'
import { MdOutlineRocketLaunch } from '@react-icons/all-files/md/MdOutlineRocketLaunch'
import argentLogo from 'data-base64:~assets/thirdparty/argent.svg'
import braavosLogo from 'data-base64:~assets/thirdparty/braavos.svg'
import { useCallback, useState } from 'react'
import { useAsyncRetry, useInterval } from 'react-use'
import { CallData, hash } from 'starknet'

import { NetworkKind } from '~lib/network'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { getStarknetClient } from '~lib/services/provider/starknet/client'
import { StarknetPermissionedProvider } from '~lib/services/provider/starknet/permissionedProvider'
import { StarknetProvider } from '~lib/services/provider/starknet/provider'
import {
  StarknetAccountType,
  canWalletSign,
  getSigningWallet
} from '~lib/wallet'
import {
  ARGENT_ACCOUNT_CONTRACT_CLASS_HASHES,
  ARGENT_PROXY_CONTRACT_CLASS_HASHES
} from '~lib/wallet'
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

      const starknet = account.info.starknet!

      let logo, name
      switch (starknet.type) {
        case StarknetAccountType.ARGENT:
          logo = argentLogo
          name = 'Argent'
          break
        case StarknetAccountType.BRAAVOS:
          logo = braavosLogo
          name = 'Braavos'
          break
        default:
      }

      return {
        isDeployed,
        isFunded,
        ...account.info.starknet!,
        logo,
        name
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

  const {
    isOpen: isAccountSettingsOpen,
    onOpen: onAccountSettingsOpen,
    onClose: onAccountSettingsClose
  } = useDisclosure()

  return info ? (
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

            <HStack>
              {info.logo && (
                <Image w={8} fit="cover" src={info.logo} alt="AA brand logo" />
              )}
              {info.name && <Text>{info.name}</Text>}
            </HStack>

            <IconButton
              variant="ghost"
              aria-label="Settings"
              size="xs"
              icon={<SettingsIcon />}
              onClick={onAccountSettingsOpen}
            />
          </HStack>
        </PopoverBody>
      </PopoverContent>

      <AccountAbstractionModal
        isOpen={isAccountSettingsOpen}
        onClose={onAccountSettingsClose}
      />
    </Popover>
  ) : (
    <></>
  )
}

const AccountAbstractionModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      returnFocusOnClose={false}
      isCentered
      motionPreset="slideInBottom"
      scrollBehavior="inside"
      size="lg">
      <ModalOverlay />
      <ModalContent maxH="100%" my={0}>
        <ModalHeader>Account Abstraction</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={3}></ModalBody>
      </ModalContent>
    </Modal>
  )
}
