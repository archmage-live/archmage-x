import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Stack,
  Text,
  chakra,
  useDisclosure
} from '@chakra-ui/react'
import { Slip10RawIndex, pathToString, stringToPath } from '@cosmjs/crypto'
import { useEffect, useState } from 'react'
import browser from 'webextension-polyfill'

import { CopyArea } from '~components/CopyIcon'
import { HdPathInput } from '~components/HdPathInput'
import { SaveInput } from '~components/SaveInput'
import { DB } from '~lib/db'
import { formatNumber } from '~lib/formatNumber'
import { INetwork, ISubWallet, IWallet, isSubNameInvalid } from '~lib/schema'
import { getAccountUrl } from '~lib/services/network'
import { useBalance } from '~lib/services/provider'
import { useChainAccountByIndex, useHdPaths } from '~lib/services/walletService'

import {
  WrappedDeleteWalletModal,
  useDeleteWalletModal
} from './DeleteWalletModal'
import { ExportPrivateKeyModal } from './ExportPrivateKeyModal'

interface SubWalletEditProps {
  network: INetwork
  wallet: IWallet
  subWallet: ISubWallet
  onDelete: () => void
}

export const SubWalletEdit = ({
  network,
  wallet,
  subWallet,
  onDelete
}: SubWalletEditProps) => {
  const account = useChainAccountByIndex(
    wallet.id,
    network.kind,
    network.chainId,
    subWallet.index
  )

  const balance = useBalance(network, account)
  const accountUrl = account && getAccountUrl(network, account)

  const hdPaths = useHdPaths(wallet.id)
  const [hdPath, setHdPath] = useState('')
  useEffect(() => {
    const hdPath = hdPaths?.get(network.kind)
    if (!hdPath) {
      return
    }
    const fullHdPath = stringToPath(hdPath).concat(
      // TODO
      Slip10RawIndex.normal(subWallet.index)
    )
    setHdPath(pathToString(fullHdPath))
  }, [hdPaths, network, subWallet])

  const {
    isOpen: isExportOpen,
    onOpen: onExportOpen,
    onClose: onExportClose
  } = useDisclosure()

  const { onOpen: onOpenDeleteWallet } = useDeleteWalletModal()

  return (
    <Stack spacing="12">
      <SubWalletNameEdit wallet={wallet} subWallet={subWallet} />

      <Stack>
        <Text fontSize="md" fontWeight="medium">
          <chakra.span color="gray.500">Master Wallet:&nbsp;</chakra.span>
          {wallet.name}
        </Text>

        <Text fontSize="md" fontWeight="medium">
          <chakra.span color="gray.500">Index:&nbsp;</chakra.span>
          {subWallet.index}
        </Text>
      </Stack>

      <Stack>
        <Text fontSize="md" fontWeight="medium">
          Address
        </Text>

        {account?.address ? (
          <CopyArea
            name="Address"
            copy={account.address}
            noWrap
            props={{
              width: 'fit-content',
              fontSize: 'lg',
              fontWeight: 'medium',
              color: 'gray.500'
            }}
          />
        ) : (
          'Not Available'
        )}
      </Stack>

      <Text fontSize="md" fontWeight="medium">
        <chakra.span color="gray.500">Balance:&nbsp;</chakra.span>
        {formatNumber(balance?.amount)} {balance?.symbol}
      </Text>

      {hdPath && (
        <FormControl>
          <FormLabel>HD Path</FormLabel>

          <HdPathInput
            forcePrefix={hdPath}
            fixedLength
            value={hdPath}
            onChange={setHdPath}
          />
        </FormControl>
      )}

      <HStack justify="end">
        {accountUrl && (
          <Button
            variant="outline"
            colorScheme="purple"
            onClick={async () => {
              await browser.tabs.create({ url: accountUrl })
            }}>
            View account on block explorer
          </Button>
        )}

        <Button variant="outline" colorScheme="purple" onClick={onExportOpen}>
          Export Private Key
        </Button>

        <Button
          colorScheme="red"
          onClick={() => {
            onOpenDeleteWallet({ subWallet })
          }}>
          Delete Account
        </Button>
      </HStack>

      {account && (
        <ExportPrivateKeyModal
          account={account}
          isOpen={isExportOpen}
          onClose={onExportClose}
        />
      )}

      <WrappedDeleteWalletModal onDelete={onDelete} />
    </Stack>
  )
}

export const SubWalletNameEdit = ({
  wallet,
  subWallet
}: {
  wallet: IWallet
  subWallet: ISubWallet
}) => {
  const [isNameExists, setIsNameExists] = useState(false)

  return (
    <FormControl isInvalid={isNameExists}>
      <FormLabel>Account Name</FormLabel>
      <SaveInput
        hideSaveIfNoChange
        stretchInput
        value={subWallet.name}
        validate={(value: string) => {
          value = value.trim().slice(0, 64)
          if (!value || isSubNameInvalid(value, subWallet.index)) {
            return false
          } else {
            return value
          }
        }}
        asyncValidate={async (value: string) => {
          return !(await DB.subWallets
            .where('[masterId+name]')
            .equals([wallet.id, value])
            .first())
        }}
        onChange={async (value: string) => {
          await DB.subWallets.update(subWallet, { name: value })
        }}
        onInvalid={setIsNameExists}
      />
      <FormErrorMessage>This account name exists.</FormErrorMessage>
    </FormControl>
  )
}
