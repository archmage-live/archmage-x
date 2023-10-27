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
  Stack,
  Text,
  chakra,
  useDisclosure
} from '@chakra-ui/react'
import { MdQrCode } from '@react-icons/all-files/md/MdQrCode'
import { SafeContractEthers } from '@safe-global/protocol-kit'
import { SafeVersion } from '@safe-global/safe-core-sdk-types'
import assert from 'assert'
import { useCallback, useEffect, useState } from 'react'
import { useAsyncRetry, useInterval } from 'react-use'
import semverSatisfies from 'semver/functions/satisfies'

import { ScanQRModal } from '~components/ScanQrModal'
import { TextLink } from '~components/TextLink'
import { ETHEREUM_MAINNET_CHAINID } from '~lib/network/evm'
import { getSafeAccount, getSafeService } from '~lib/safe'
import { INetwork } from '~lib/schema'
import { getAccountUrl } from '~lib/services/network'
import { EvmClient } from '~lib/services/provider/evm'
import { SafeInfo, SafeOwner, checkAddress } from '~lib/wallet'

export const ImportSafe = ({
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
  const [accountAddress, setAccountAddress] = useState<string>('')

  const [safeVersion, setSafeVersion] = useState<SafeVersion>()
  const [owners, setOwners] = useState<SafeOwner[]>([])
  const [threshold, setThreshold] = useState<number>(0)
  const [saltNonce, setSaltNonce] = useState<string>()
  const [isL1SafeMasterCopy, setIsL1SafeMasterCopy] = useState<boolean>()

  const {
    isOpen: isScanAddressOpen,
    onOpen: onScanAddressOpen,
    onClose: onScanAddressClose
  } = useDisclosure()

  const onScanAddress = useCallback(
    (text: string) => {
      const address = checkAddress(network.kind, text)
      if (!address) {
        return
      }
      setAccountAddress(address)
    },
    [network]
  )

  const clear = useCallback(() => {
    setOwners([])
    setThreshold(0)
    setSaltNonce(undefined)
    setAccount(undefined)
    setAlert('')
  }, [setAccount, setAlert])

  const { loading, error, retry } = useAsyncRetry(async () => {
    if (!accountAddress) {
      clear()
      return
    }
    const safeAddress = checkAddress(network.kind, accountAddress)
    if (!safeAddress) {
      clear()
      setAlert('Invalid address')
      return
    }

    let safeVersion, owners, threshold, saltNonce, isL1SafeMasterCopy
    let to, data, fallbackHandler, paymentToken, payment, paymentReceiver
    const provider = await EvmClient.from(network.chainId)
    try {
      const safeAccount = await getSafeAccount(provider, safeAddress)
      /*
      safeVersion = await safeAccount.getContractVersion()
      owners = (await safeAccount.getOwners()).map((owner) => ({
        name: '',
        address: checkAddress(network.kind, owner) as string
      }))
      threshold = await safeAccount.getThreshold()
      */
      const safeService = getSafeService(provider, network.chainId)
      const info = await safeService.getSafeInfo(safeAddress)
      const versionSplits = info.version.split('+')
      safeVersion = versionSplits[0] as SafeVersion
      // isL1SafeMasterCopy means using the SafeL1 contract on a L2 network
      isL1SafeMasterCopy =
        versionSplits[1] === 'L1' &&
        network.chainId !== ETHEREUM_MAINNET_CHAINID
      owners = info.owners.map((owner) => ({
        name: '',
        address: checkAddress(network.kind, owner) as string
      }))
      threshold = info.threshold
      // TODO: get saltNonce from the creation tx data

      const creationInfo = await safeService.getSafeCreationInfo(safeAddress)

      const safeContract = safeAccount.getContractManager().safeContract
      assert(safeContract)
      const setupData = (
        safeContract as SafeContractEthers
      ).contract.interface.decodeFunctionData('setup', creationInfo.setupData)
      let _owners, _threshold
      if (semverSatisfies(safeVersion, '<=1.0.0')) {
        ;[
          _owners,
          _threshold,
          to,
          data,
          paymentToken,
          payment,
          paymentReceiver
        ] = setupData
      } else {
        ;[
          _owners,
          _threshold,
          to,
          data,
          fallbackHandler,
          paymentToken,
          payment,
          paymentReceiver
        ] = setupData
      }
    } catch {
      clear()
      setAlert('Address given is not a valid Safe Account address')
      return
    }

    setSafeVersion(safeVersion)
    setOwners(owners)
    setThreshold(threshold)
    setSaltNonce(saltNonce)
    setIsL1SafeMasterCopy(isL1SafeMasterCopy)

    setAccount({
      hash: safeAddress,
      address: safeAddress,
      isDeployed: true,
      safe: {
        safeVersion,
        threshold,
        owners,
        setupConfig: {
          to,
          data,
          fallbackHandler,
          paymentToken,
          payment,
          paymentReceiver
        },
        saltNonce,
        isL1SafeMasterCopy
      }
    })

    setAlert('')
  }, [network, setAccount, accountAddress, clear])

  useInterval(retry, !loading && error ? 5000 : null)

  useEffect(() => {
    setIsLoading(loading)
  }, [setIsLoading, loading])

  return (
    <>
      <FormControl>
        <FormLabel>Safe Account</FormLabel>
        <InputGroup size="lg">
          <Input
            sx={{ paddingInlineEnd: '63px' }}
            errorBorderColor="red.500"
            isInvalid={
              !!accountAddress && !checkAddress(network.kind, accountAddress)
            }
            value={accountAddress}
            onChange={(e) => setAccountAddress(e.target.value.trim())}
          />
          <InputRightElement w="63px">
            <ButtonGroup size="sm" isAttached variant="ghost">
              <IconButton
                aria-label="Scan QR code"
                icon={<Icon fontSize="xl" as={MdQrCode} />}
                onClick={onScanAddressOpen}
              />
            </ButtonGroup>
          </InputRightElement>
        </InputGroup>
        <FormHelperText>
          Paste the address of the Safe Account you want to import.
        </FormHelperText>
      </FormControl>

      {owners.length > 0 && (
        <Stack spacing={6}>
          <FormControl>
            <FormLabel>Owners</FormLabel>
            <Stack>
              {owners.map((owner, index) => {
                return (
                  <Owner
                    key={index}
                    index={index}
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
                    network={network}
                  />
                )
              })}
            </Stack>
          </FormControl>

          <FormControl>
            <FormLabel>Threshold</FormLabel>
            <Text>
              <chakra.span fontWeight="medium">{threshold}</chakra.span>
              &nbsp;out of {owners.length} owner(s)
            </Text>
          </FormControl>

          {typeof saltNonce === 'string' && (
            <FormControl>
              <FormLabel>Salt nonce</FormLabel>
              <Text>{saltNonce}</Text>
            </FormControl>
          )}

          <FormControl>
            <FormLabel>Safe contract version</FormLabel>
            <Text>
              {safeVersion}+
              {network.chainId === ETHEREUM_MAINNET_CHAINID ||
              isL1SafeMasterCopy
                ? 'L1'
                : 'L2'}
            </Text>
          </FormControl>
        </Stack>
      )}

      <ScanQRModal
        isOpen={isScanAddressOpen}
        onClose={onScanAddressClose}
        onScan={onScanAddress}
      />
    </>
  )
}

const Owner = ({
  index,
  name,
  setName,
  address,
  network
}: {
  index: number
  name: string
  setName: (name: string) => void
  address: string
  network: INetwork
}) => {
  return (
    <HStack spacing={4}>
      <Input
        size="lg"
        w={28}
        placeholder={`Owner ${index + 1}`}
        maxLength={64}
        value={name}
        onChange={(e) => setName(e.target.value.trim())}
      />

      <TextLink
        text={address}
        name={`Owner ${index + 1}`}
        url={getAccountUrl(network, address)}
        urlLabel="View on explorer"
        prefixChars={40}
      />
    </HStack>
  )
}
