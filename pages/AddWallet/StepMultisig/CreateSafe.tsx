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
import { MdQrCode } from '@react-icons/all-files/md/MdQrCode'
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import {
  NETWORK_SCOPES,
  NetworkKind,
  getNetworkKind,
  getNetworkScope
} from '~lib/network'
import { IChainAccount, ISubWallet, IWallet } from '~lib/schema'
import { ExistingGroupWallet } from '~lib/services/wallet'
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
    if (owners && threshold !== undefined && threshold > owners.length) {
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

  const onNext = useCallback(async () => {
    await nextStep()
  }, [nextStep])

  const {
    isOpen: isSelectWalletOpen,
    onOpen: onSelectWalletOpen,
    onClose: onSelectWalletClose
  } = useDisclosure()

  const {
    isOpen: isScanAddressOpen,
    onOpen: onScanAddressOpen,
    onClose: onScanAddressClose
  } = useDisclosure()

  const {
    isOpen: isSelectAccountOpen,
    onOpen: onSelectAccountOpen,
    onClose: onSelectAccountClose
  } = useDisclosure()

  return (
    <Stack spacing={12}>
      <Stack spacing={8}>
        <FormControl>
          <FormLabel>Network kind</FormLabel>
          <Select w={48} value={networkKind}>
            <option key={getNetworkScope(networkKind)} value={networkKind}>
              {getNetworkScope(networkKind)}
            </option>
          </Select>
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
                  onScanAddressOpen={onScanAddressOpen}
                  onSelectAccountOpen={onSelectAccountOpen}
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
        w={36}
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
