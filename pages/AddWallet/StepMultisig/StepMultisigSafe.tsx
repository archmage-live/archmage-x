import {
  Button,
  ButtonGroup,
  Checkbox,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Select,
  Stack,
  Text,
  chakra,
  useDisclosure
} from '@chakra-ui/react'
import assert from 'assert'
import { useCallback, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { NetworkSelect } from '~components/NetworkSelect'
import { SafeLogo } from '~components/SafeLogo'
import { NetworkKind, getNetworkScope } from '~lib/network'
import { isSafeSupported } from '~lib/safe'
import { INetwork, PSEUDO_INDEX } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'
import {
  ExistingGroupWallet,
  useNextSubWalletIndex
} from '~lib/services/wallet'
import {
  AccountAbstractionType,
  MultisigWalletType,
  SafeInfo,
  WalletType
} from '~lib/wallet'

import { NameInput } from '../NameInput'
import {
  SelectExistingWalletModal,
  WalletItemButton
} from '../SelectExistingWallet'
import {
  AddWalletKind,
  useAccountAbstraction,
  useAccounts,
  useAddSubWallets,
  useAddWallet,
  useAddWalletKind,
  useExistingWallet,
  useMultisigType,
  useName
} from '../addWallet'
import { CreateSafe } from './CreateSafe'
import { ImportSafe } from './ImportSafe'

export const StepMultisigSafe = () => {
  const { nextStep } = useWizard()

  const kinds = ['Create', 'Import'] as const
  const [kind, setKind] = useState<typeof kinds[number]>(kinds[0])

  // Safe only supports Ethereum network
  const networkKind = NetworkKind.EVM
  const networkScope = getNetworkScope(networkKind)
  const [network, setNetwork] = useState<INetwork>()

  const [, setMultisigType] = useMultisigType()
  const [, setAccountAbstraction] = useAccountAbstraction()
  useEffect(() => {
    setMultisigType(MultisigWalletType.SAFE)
    setAccountAbstraction({
      type: AccountAbstractionType.SAFE
    })
  }, [setMultisigType, setAccountAbstraction])

  const [name, setName] = useName()
  const [accounts, setAccounts] = useAccounts()

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

  const nextIndex = useNextSubWalletIndex(existingGroupWallet?.wallet.id)

  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [network, name])

  const [isLoading, setIsLoading] = useState(false)

  const {
    isOpen: isSelectWalletOpen,
    onOpen: onSelectWalletOpen,
    onClose: onSelectWalletClose
  } = useDisclosure()

  const [account, setAccount] = useState<{
    hash: string
    address: string
    isDeployed: boolean
    safe: SafeInfo
  }>()
  useEffect(() => {
    setAccount(undefined)
  }, [kind, network])

  useEffect(() => {
    if (nextIndex === undefined || !account) {
      setAccounts([])
      return
    }
    setAccounts(
      [
        {
          index: isUseGroupChecked ? nextIndex : PSEUDO_INDEX,
          hash: account.hash,
          addresses: {
            [networkKind]: {
              address: account.address,
              chainId: network?.chainId
            }
          },
          safe: account.safe
        }
      ],
      isUseGroupChecked
    )
  }, [isUseGroupChecked, nextIndex, setAccounts, account, networkKind, network])

  const addWallet = useAddWallet()
  const addSubWallets = useAddSubWallets()

  const onNext = useCallback(async () => {
    assert(accounts.length)

    const hashes = accounts.map(({ hash }) => hash)
    if (
      new Set(hashes.concat(existingGroupWallet?.hashes || [])).size !==
      hashes.length + (existingGroupWallet?.hashes.length || 0)
    ) {
      setAlert(
        'Duplicate Safe account (predicted from owners, threshold and salt nonce)'
      )
      return
    }

    if (!willAddToExistingGroupChecked) {
      const { error } = await addWallet()
      if (error) {
        setAlert(error)
        return
      }
    } else {
      const { error } = await addSubWallets()
      if (error) {
        setAlert(error)
        return
      }
    }

    await nextStep()
  }, [
    nextStep,
    accounts,
    willAddToExistingGroupChecked,
    existingGroupWallet,
    addWallet,
    addSubWallets
  ])

  return (
    <Stack p="4" pt="16" spacing="6">
      <Stack>
        <HStack spacing={4} justify="center">
          <Text fontSize="4xl" fontWeight="bold">
            {kind === 'Create' ? 'Create' : 'Import'}
          </Text>
          <SafeLogo w={48} />
          <Text fontSize="4xl" fontWeight="bold">
            Account
          </Text>
        </HStack>
        <Text fontSize="lg" color="gray.500" textAlign="center">
          {kind === 'Create'
            ? 'A new Account that is controlled by one or multiple owners.'
            : 'Already have a Safe Account? Add it via its address.'}
        </Text>
      </Stack>

      <HStack justify="center">
        <ButtonGroup size="md" colorScheme="purple" isAttached>
          <Button
            minW="96px"
            variant={kind === 'Create' ? 'solid' : 'outline'}
            onClick={() => setKind('Create')}>
            ➕ Create
          </Button>
          <Button
            minW="96px"
            variant={kind === 'Import' ? 'solid' : 'outline'}
            onClick={() => setKind('Import')}>
            ↘️ Import
          </Button>
        </ButtonGroup>
      </HStack>

      <Divider />

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
              <NetworkSelect
                networkKind={networkKind}
                onSetNetwork={setNetwork}
              />
            </HStack>
            <FormHelperText>
              Safe only supports Ethereum networks at the moment.
            </FormHelperText>
          </FormControl>

          {network && isSafeSupported(network.chainId) && (
            <>
              {kind === 'Create' ? (
                <CreateSafe
                  network={network}
                  setAccount={setAccount}
                  setAlert={setAlert}
                  setIsLoading={setIsLoading}
                />
              ) : (
                <ImportSafe
                  network={network}
                  setAccount={setAccount}
                  setAlert={setAlert}
                  setIsLoading={setIsLoading}
                />
              )}

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
                placeholder={
                  isUseGroupChecked ? 'Group Name (Optional)' : undefined
                }
              />
            </>
          )}

          <AlertBox>
            {network && !isSafeSupported(network.chainId)
              ? `Safe is not supported on ${
                  getNetworkInfo(network).name
                } network`
              : undefined}
          </AlertBox>

          {!alert && kind === 'Create' && account?.address && (
            <AlertBox level={!account.isDeployed ? 'info' : 'warning'}>
              Predicted Safe Account address: {account.address}.
              {account.isDeployed && (
                <chakra.span>
                  &nbsp;The account has been deployed on the network.
                </chakra.span>
              )}
            </AlertBox>
          )}

          <AlertBox>{alert}</AlertBox>
        </Stack>

        <Button
          h="14"
          size="lg"
          colorScheme="purple"
          borderRadius="8px"
          isDisabled={!network || !accounts.length}
          isLoading={isLoading}
          onClick={onNext}>
          Continue
        </Button>
      </Stack>

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
