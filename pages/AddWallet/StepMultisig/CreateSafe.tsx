import { AddIcon, MinusIcon, SearchIcon } from '@chakra-ui/icons'
import {
  ButtonGroup,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  Stack,
  Text,
  useDisclosure
} from '@chakra-ui/react'
import { MdQrCode } from '@react-icons/all-files/md/MdQrCode'
import {
  DEFAULT_SAFE_VERSION,
  PREDETERMINED_SALT_NONCE,
  PredictedSafeProps
} from '@safe-global/protocol-kit'
import { SafeVersion } from '@safe-global/safe-core-sdk-types'
import { useCallback, useEffect, useState } from 'react'
import * as React from 'react'
import { useAsyncRetry, useDebounce, useInterval } from 'react-use'

import { ScanQRModal } from '~components/ScanQrModal'
import { SelectAccountModal } from '~components/SelectAccountModal'
import { NetworkKind } from '~lib/network'
import { ETHEREUM_MAINNET_CHAINID } from '~lib/network/evm'
import { SAFE_VERSIONS, getSafeAccount } from '~lib/safe'
import {
  ChainId,
  CompositeAccount,
  IChainAccount,
  INetwork,
  ISubWallet,
  IWallet,
  accountName
} from '~lib/schema'
import { EvmClient } from '~lib/services/provider/evm'
import { WALLET_SERVICE, useChainAccounts } from '~lib/services/wallet'
import { SafeInfo, SafeOwner, checkAddress } from '~lib/wallet'

export const CreateSafe = ({
  network,
  setAccount,
  setAlert,
  setIsLoading
}: {
  network: INetwork
  setAccount: (account?: {
    hash: string
    address: string
    isDeployed: boolean
    safe: SafeInfo
  }) => void
  setAlert: (alert: string) => void
  setIsLoading: (isLoading: boolean) => void
}) => {
  const [safeVersion, setSafeVersion] = useState(DEFAULT_SAFE_VERSION)
  const [owners, setOwners] = useState<SafeOwner[]>([
    {
      name: '',
      address: ''
    }
  ])
  const [threshold, setThreshold] = useState<number>(1)
  const [saltNonce, setSaltNonce] = useState<string>(PREDETERMINED_SALT_NONCE)

  useEffect(() => {
    if (owners.length > 0 && threshold > owners.length) {
      setThreshold(owners.length)
    }
  }, [owners, threshold])

  useEffect(() => {
    setAlert('')
  }, [setAlert, owners, threshold, saltNonce])

  const {
    isOpen: isSelectAccountOpen,
    onOpen: _onSelectAccountOpen,
    onClose: onSelectAccountClose
  } = useDisclosure()

  const {
    isOpen: isScanAddressOpen,
    onOpen: _onScanAddressOpen,
    onClose: onScanAddressClose
  } = useDisclosure()

  const [selectedIndex, setSelectedIndex] = useState<number>()

  const [selectedAccount, _setSelectedAccount] = useState<CompositeAccount>()

  const allAccounts = useChainAccounts({
    networkKind: network.kind,
    chainId: network?.chainId
  })

  const onSelectAccount = useCallback(
    async (account: CompositeAccount) => {
      if (selectedIndex === undefined) {
        return
      }

      const newOwners = [...owners]
      const name = newOwners[selectedIndex].name
      newOwners[selectedIndex] = {
        name: name.trim() ? name : accountName(account),
        address: account.account.address!
      }

      setOwners(newOwners)
    },
    [owners, setOwners, selectedIndex]
  )

  const onScanAddress = useCallback(
    async (text: string) => {
      const address = checkAddress(network.kind, text)
      if (!address || selectedIndex === undefined) {
        return
      }
      const newOwners = [...owners]
      newOwners[selectedIndex] = {
        ...newOwners[selectedIndex],
        address
      }
      setOwners(newOwners)
    },
    [network, owners, setOwners, selectedIndex]
  )

  const onSelectAccountOpen = useCallback(
    async (index: number) => {
      const owner = owners.at(index)
      if (!owner) {
        return
      }

      const address = checkAddress(network.kind, owner.address)
      const account = allAccounts?.find((a) => a.address === address)
      let wallet, subWallet
      if (account) {
        wallet = await WALLET_SERVICE.getWallet(account.masterId)
        subWallet = await WALLET_SERVICE.getSubWallet({
          masterId: account.masterId,
          index: account.index
        })
      }

      setSelectedIndex(index)
      _setSelectedAccount(
        wallet && subWallet && account
          ? {
              wallet,
              subWallet,
              account
            }
          : undefined
      )

      _onSelectAccountOpen()
    },
    [network, owners, allAccounts, _onSelectAccountOpen]
  )

  const onScanAddressOpen = useCallback(
    (index: number) => {
      setSelectedIndex(index)
      _onScanAddressOpen()
    },
    [_onScanAddressOpen]
  )

  const [args, setArgs] = useState<{
    chainId: ChainId
    safeVersion: SafeVersion
    threshold: number
    owners: SafeOwner[]
    saltNonce: string
  }>()

  useDebounce(
    () => {
      setArgs(undefined)

      if (!owners.every(({ address }) => checkAddress(network.kind, address))) {
        if (
          owners.some(
            ({ address }) => !!address && !checkAddress(network.kind, address)
          )
        ) {
          setAlert('Invalid address')
        } else {
          setAlert('')
        }
        return
      }

      if (
        new Set(owners.map(({ address }) => address)).size !== owners.length
      ) {
        setAlert('Duplicate owner address')
        return
      }

      try {
        const nonce = BigInt(saltNonce)
        if (nonce < 0 || nonce > (1n << 256n) - 1n) {
          setAlert('Salt nonce must be in range [0, 2 ^ 256 - 1]')
          return
        }
      } catch {
        setAlert('Salt nonce must be an integer or its hex representation')
        return
      }

      setArgs({
        chainId: network.chainId,
        safeVersion,
        threshold,
        owners,
        saltNonce
      })
      setAlert('')
    },
    1000,
    [network, safeVersion, threshold, owners, saltNonce]
  )

  const { loading, error, retry } = useAsyncRetry(async () => {
    if (!args) {
      setAccount()
      return
    }

    const cfg: PredictedSafeProps = {
      safeAccountConfig: {
        owners: args.owners.map((owner) => owner.address),
        threshold: args.threshold
      },
      safeDeploymentConfig: {
        saltNonce: args.saltNonce.toString()
      }
    }

    try {
      // always use mainnet safe address as hash
      const provider0 = await EvmClient.from(ETHEREUM_MAINNET_CHAINID)
      const safeAccount0 = await getSafeAccount(provider0, cfg)
      const hash = await safeAccount0.getAddress()

      const provider = await EvmClient.from(args.chainId)
      const safeAccount = await getSafeAccount(provider, cfg)
      const address = await safeAccount.getAddress()
      const isDeployed = await safeAccount.isSafeDeployed()

      setAccount({
        hash,
        address,
        isDeployed,
        safe: {
          safeVersion: args.safeVersion,
          threshold: args.threshold,
          owners: args.owners.map((owner) => ({
            ...owner,
            address: checkAddress(network.kind, owner.address) as string
          })),
          setupConfig: {},
          saltNonce: args.saltNonce
        }
      })

      setAlert('')
    } catch (err) {
      console.error(err)
      setAccount()
      setAlert('Cannot predict the Safe Account address')
      throw err
    }
  }, [setAccount, setAlert, args])

  useInterval(retry, !loading && error ? 5000 : null)

  useEffect(() => {
    setIsLoading(loading)
  }, [setIsLoading, loading])

  return (
    <>
      <FormControl>
        <FormLabel>Owners</FormLabel>
        <Stack>
          {owners.map((owner, index) => {
            return (
              <Owner
                key={index}
                index={index}
                isNotOnlyOne={owners.length > 1}
                isLast={index === owners.length - 1}
                name={owner.name}
                setName={(name) => {
                  const newOwners = [...owners]
                  newOwners[index] = {
                    ...newOwners[index],
                    name
                  }
                  setOwners(newOwners)
                }}
                address={owner.address}
                setAddress={(address) => {
                  const newOwners = [...owners]
                  newOwners[index] = {
                    ...newOwners[index],
                    address
                  }
                  setOwners(newOwners)
                }}
                addOwner={() =>
                  setOwners([...owners, { name: '', address: '' }])
                }
                removeOwner={() => {
                  const newOwners = [...owners]
                  newOwners.splice(index, 1)
                  setOwners(newOwners)
                }}
                onScanAddressOpen={() => onScanAddressOpen(index)}
                onSelectAccountOpen={() => onSelectAccountOpen(index)}
                networkKind={network.kind}
              />
            )
          })}
        </Stack>
        <FormHelperText>
          Every owner has the same rights within the Safe account and can
          propose, sign and execute transactions that have the required
          confirmations.
        </FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel>Threshold</FormLabel>
        <HStack>
          <Select
            size="lg"
            w={48}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}>
            {[...Array(owners.length).keys()].map((index) => {
              return (
                <option key={index} value={index + 1}>
                  {index + 1}
                </option>
              )
            })}
          </Select>
          <Text>out of {owners.length} owner(s)</Text>
        </HStack>
        <FormHelperText>
          Recommend using a threshold higher than one to prevent losing access
          to the Safe account in case an owner key is lost or compromised.
        </FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel>Salt nonce</FormLabel>
        <Input
          size="lg"
          value={saltNonce}
          onChange={(e) => setSaltNonce(e.target.value)}
        />
        <FormHelperText>
          Nonce that will be used to generate the salt to calculate the address
          of the new account contract.
        </FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel>Safe contract version</FormLabel>
        <Select
          size="lg"
          value={safeVersion}
          onChange={(e) => setSafeVersion(e.target.value as SafeVersion)}>
          {SAFE_VERSIONS.map((version, index) => {
            return (
              <option key={index} value={version}>
                {version}+
                {network.chainId === ETHEREUM_MAINNET_CHAINID ? 'L1' : 'L2'}
              </option>
            )
          })}
        </Select>
      </FormControl>

      <ScanQRModal
        isOpen={isScanAddressOpen}
        onClose={onScanAddressClose}
        onScan={onScanAddress}
      />

      <SelectAccountModal
        network={network}
        account={selectedAccount}
        setAccount={onSelectAccount}
        isOpen={isSelectAccountOpen}
        onClose={onSelectAccountClose}
      />
    </>
  )
}

const Owner = ({
  index,
  isNotOnlyOne,
  isLast,
  name,
  setName,
  address,
  setAddress,
  addOwner,
  removeOwner,
  onScanAddressOpen,
  onSelectAccountOpen,
  networkKind,
  wallet
}: {
  index: number
  isNotOnlyOne: boolean
  isLast: boolean
  name: string
  setName: (name: string) => void
  address: string
  setAddress: (address: string) => void
  addOwner: () => void
  removeOwner: () => void
  onScanAddressOpen: () => void
  onSelectAccountOpen: () => void
  networkKind: NetworkKind
  wallet?: {
    wallet: IWallet
    subWallet: ISubWallet
    account: IChainAccount
  }
}) => {
  return (
    <HStack>
      <Input
        size="lg"
        w={40}
        placeholder={`Owner ${index + 1}`}
        maxLength={64}
        value={name}
        onChange={(e) => setName(e.target.value.trim())}
      />

      <InputGroup size="lg">
        <Input
          sx={{ paddingInlineEnd: '63px' }}
          placeholder={`Address ${index + 1}`}
          errorBorderColor="red.500"
          isInvalid={!!address && !checkAddress(networkKind, address)}
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
        />
        <InputRightElement w="63px">
          <ButtonGroup size="sm" isAttached variant="ghost">
            <IconButton
              aria-label="Scan QR code"
              icon={<Icon fontSize="xl" as={MdQrCode} />}
              onClick={onScanAddressOpen}
            />
            <IconButton
              aria-label="Select existing account"
              icon={<SearchIcon />}
              onClick={onSelectAccountOpen}
            />
          </ButtonGroup>
        </InputRightElement>
      </InputGroup>

      <IconButton
        size="xs"
        aria-label="Add owner"
        icon={<AddIcon />}
        visibility={isLast ? 'visible' : 'hidden'}
        onClick={addOwner}
      />

      <IconButton
        size="xs"
        aria-label="Remove owner"
        icon={<MinusIcon />}
        visibility={isNotOnlyOne ? 'visible' : 'hidden'}
        onClick={removeOwner}
      />
    </HStack>
  )
}
