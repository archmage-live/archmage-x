import { AddIcon, MinusIcon, SearchIcon } from '@chakra-ui/icons'
import {
  Button,
  ButtonGroup,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Stack,
  Text,
  chakra,
  useDisclosure
} from '@chakra-ui/react'
import { hexlify } from '@ethersproject/bytes'
import { MdQrCode } from '@react-icons/all-files/md/MdQrCode'
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useAsyncRetry, useDebounce } from 'react-use'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { ScanQRModal } from '~components/ScanQrModal'
import { SelectAccountModal } from '~components/SelectAccountModal'
import { NetworkKind, getNetworkScope } from '~lib/network'
import { computeSafeAddress, isSafeSupported } from '~lib/safe'
import {
  ChainId,
  CompositeAccount,
  IChainAccount,
  ISubWallet,
  IWallet,
  accountName
} from '~lib/schema'
import { getNetworkInfo, useNetwork, useNetworks } from '~lib/services/network'
import { EvmClient } from '~lib/services/provider/evm'
import {
  ExistingGroupWallet,
  WALLET_SERVICE,
  useChainAccounts
} from '~lib/services/wallet'
import { WalletType, checkAddress } from '~lib/wallet'

import { NameInput } from '../NameInput'
import {
  SelectExistingWalletModal,
  WalletItemButton
} from '../SelectExistingWallet'
import {
  AddWalletKind,
  useAddWalletKind,
  useExistingWallet,
  useName,
  useOwners,
  useSaltNonce,
  useThreshold
} from '../addWallet'

export const CreateSafe = () => {
  const { nextStep } = useWizard()

  // Safe only supports Ethereum network
  const networkKind = NetworkKind.EVM
  const networkScope = getNetworkScope(networkKind)
  const networksOfKind = useNetworks(networkKind)
  const [networkId, setNetworkId] = useState<number>()
  const network = useNetwork(networkId)

  useEffect(() => {
    if (networksOfKind?.length) {
      setNetworkId(networksOfKind[0].id)
    } else {
      setNetworkId(undefined)
    }
  }, [networksOfKind])

  const [name, setName] = useName()
  const [owners, setOwners] = useOwners()
  const [threshold, setThreshold] = useThreshold()
  const [saltNonce, setSaltNonce] = useSaltNonce()

  useEffect(() => {
    if (!owners) {
      setOwners([
        {
          name: '',
          address: ''
        }
      ])
    }
    if (saltNonce === undefined) {
      setSaltNonce(Date.now())
    }
  }, [owners, setOwners, saltNonce, setSaltNonce])

  useEffect(() => {
    if (threshold === undefined) {
      setThreshold(1)
    } else if (owners && threshold > owners.length) {
      setThreshold(owners.length)
    }
  }, [owners, threshold, setThreshold])

  const [, setAddWalletKind] = useAddWalletKind()
  const [, setExistingWallet] = useExistingWallet()
  const [willAddToExistingGroupChecked, setWillAddToExistingGroupChecked] =
    useState(false)
  const [existingGroupWallet, setExistingGroupWallet] = useState<
    ExistingGroupWallet | undefined
  >(undefined)
  const [isUseGroupChecked, setIsUseGroupChecked] = useState(false)
  useEffect(() => {
    setExistingWallet(existingGroupWallet?.wallet)
  }, [setExistingWallet, existingGroupWallet])
  useEffect(() => {
    setIsUseGroupChecked(willAddToExistingGroupChecked)
  }, [willAddToExistingGroupChecked])

  useEffect(() => {
    setAddWalletKind(
      !isUseGroupChecked
        ? AddWalletKind.MULTI_SIG
        : AddWalletKind.MULTI_SIG_GROUP
    )
  }, [isUseGroupChecked, setAddWalletKind])

  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [name, owners, threshold, saltNonce])

  const {
    isOpen: isSelectWalletOpen,
    onOpen: onSelectWalletOpen,
    onClose: onSelectWalletClose
  } = useDisclosure()

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

  const accounts = useChainAccounts({
    networkKind,
    chainId: network?.chainId
  })

  const onSelectAccount = useCallback(
    async (account: CompositeAccount) => {
      if (!owners || selectedIndex === undefined) {
        return
      }

      const newOwners = [...owners]
      const name = newOwners[selectedIndex].name
      newOwners[selectedIndex] = {
        name: name.trim() ? name : accountName(account),
        address: account.account.address!,
        associated: {
          masterId: account.wallet.id,
          index: account.subWallet.index
        }
      }

      setOwners(newOwners)
    },
    [owners, setOwners, selectedIndex]
  )

  const onScanAddress = useCallback(
    async (text: string) => {
      const address = checkAddress(networkKind, text)
      if (!address || !owners || selectedIndex === undefined) {
        return
      }
      const newOwners = [...owners]
      newOwners[selectedIndex] = {
        ...newOwners[selectedIndex],
        address
      }
      setOwners(newOwners)
    },
    [networkKind, owners, setOwners, selectedIndex]
  )

  const onSelectAccountOpen = useCallback(
    async (index: number) => {
      if (!network) {
        return
      }

      const owner = owners?.at(index)
      if (!owner) {
        return
      }

      let wallet, subWallet, account
      if (owner.associated) {
        wallet = await WALLET_SERVICE.getWallet(owner.associated.masterId)
        subWallet = await WALLET_SERVICE.getSubWallet(owner.associated)
        account = await WALLET_SERVICE.getChainAccount({
          masterId: owner.associated.masterId,
          index: owner.associated.index,
          networkKind: network.kind,
          chainId: network.chainId
        })
      } else {
        const address = checkAddress(network.kind, owner.address)
        account = accounts?.find((a) => a.address === address)
        if (account) {
          wallet = await WALLET_SERVICE.getWallet(account.masterId)
          subWallet = await WALLET_SERVICE.getSubWallet({
            masterId: account.masterId,
            index: account.index
          })
        }
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
    [network, owners, accounts, _onSelectAccountOpen]
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
    threshold: number
    owners: string[]
    saltNonce: number
  }>()

  useDebounce(
    () => {
      if (
        !network ||
        threshold === undefined ||
        !owners ||
        saltNonce === undefined
      ) {
        console.log(network, threshold, owners, saltNonce)
        return
      }

      if (!owners.every(({ address }) => checkAddress(network.kind, address))) {
        console.log('invalid address')
        return
      }

      if (!isSafeSupported(network.chainId)) {
        console.log('not supported')
        return
      }

      setArgs({
        chainId: network.chainId,
        threshold: threshold,
        owners: owners.map(({ address }) => address),
        saltNonce: saltNonce
      })
    },
    1000,
    [network, threshold, owners, saltNonce]
  )

  useAsyncRetry(async () => {
    if (!args) {
      console.log('no args')
      return
    }
    if (!isSafeSupported(args.chainId)) {
      console.log('not supported')
      return
    }

    const provider = await EvmClient.from(args.chainId)

    const accountAddress = await computeSafeAddress(
      provider,
      hexlify(args.chainId),
      args.threshold,
      args.owners,
      args.saltNonce
    )

    console.log(accountAddress)
  }, [args])

  const onNext = useCallback(async () => {
    await nextStep()
  }, [nextStep])

  return (
    <Stack spacing={12}>
      <Stack spacing={8}>
        <FormControl>
          <FormLabel>Network kind</FormLabel>
          <HStack justify="space-around" spacing={8}>
            <Select w={48} value={networkKind} onChange={() => {}}>
              <option key={networkScope} value={networkKind}>
                {networkScope}
              </option>
            </Select>

            <Select
              placeholder={
                networksOfKind && !networksOfKind.length
                  ? `No ${networkScope ? `${networkScope} ` : ''}Network`
                  : undefined
              }
              value={networkId}
              onChange={(e) => {
                setNetworkId(+e.target.value)
              }}>
              {networksOfKind?.map((net) => {
                const info = getNetworkInfo(net)
                return (
                  <option key={net.id} value={net.id}>
                    {info.name}
                  </option>
                )
              })}
            </Select>
          </HStack>

          <FormHelperText>
            Safe only supports Ethereum networks at the moment.
          </FormHelperText>
        </FormControl>

        <FormControl>
          <FormLabel>Owners</FormLabel>
          <Stack>
            {owners?.map((owner, index) => {
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
                  networkKind={networkKind}
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
              {[...Array(owners?.length).keys()].map((index) => {
                return (
                  <option key={index} value={index + 1}>
                    {index + 1}
                  </option>
                )
              })}
            </Select>
            <Text>out of {owners?.length} owners</Text>
          </HStack>
          <FormHelperText>
            Recommend using a threshold higher than one to prevent losing access
            to the Safe account in case an owner key is lost or compromised.
          </FormHelperText>
        </FormControl>

        <FormControl>
          <FormLabel>Salt nonce</FormLabel>
          <NumberInput
            size="lg"
            value={saltNonce}
            onChange={(_, value) => setSaltNonce(value)}
            precision={0}
            step={1}
            min={0}
            keepWithinRange>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <FormHelperText>
            Nonce that will be used to generate the salt to calculate the
            address of the new account contract.
          </FormHelperText>
        </FormControl>

        <Stack>
          <Checkbox
            size="lg"
            colorScheme="purple"
            isChecked={willAddToExistingGroupChecked}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectWalletOpen()
              } else {
                setWillAddToExistingGroupChecked(false)
                setExistingGroupWallet(undefined)
              }
            }}>
            <chakra.span color="gray.500" fontSize="lg">
              Add to an existing Safe group wallet.
            </chakra.span>
          </Checkbox>

          {existingGroupWallet && (
            <WalletItemButton
              wallet={existingGroupWallet}
              onClick={onSelectWalletOpen}
              buttonVariant="outline"
            />
          )}
        </Stack>

        {!willAddToExistingGroupChecked && (
          <Checkbox
            size="lg"
            colorScheme="purple"
            isChecked={isUseGroupChecked}
            onChange={(e) => setIsUseGroupChecked(e.target.checked)}>
            <chakra.span color="gray.500" fontSize="lg">
              Create group to manage this account.
            </chakra.span>
          </Checkbox>
        )}

        <NameInput
          value={name}
          onChange={setName}
          placeholder={isUseGroupChecked ? 'Group Name (Optional)' : undefined}
        />

        <AlertBox>{alert}</AlertBox>
      </Stack>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        onClick={onNext}>
        Continue
      </Button>

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

      <SelectExistingWalletModal
        walletType={WalletType.MULTI_SIG_GROUP}
        selected={existingGroupWallet}
        onSelected={(w) => {
          setWillAddToExistingGroupChecked(true)
          setExistingGroupWallet(w)
        }}
        isOpen={isSelectWalletOpen}
        onClose={onSelectWalletClose}
      />
    </Stack>
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
          size="lg"
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
