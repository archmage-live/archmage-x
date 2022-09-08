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

import { HdPathInput } from '~components/HdPathInput'
import { SaveInput } from '~components/SaveInput'
import { DB } from '~lib/db'
import { INetwork, ISubWallet, IWallet } from '~lib/schema'
import { useChainAccountByIndex, useHdPaths } from '~lib/services/walletService'
import { ExportPrivateKeyModal } from '~pages/Settings/SettingsWallets/ExportPrivateKeyModal'

interface SubWalletEditProps {
  network: INetwork
  wallet: IWallet
  subWallet: ISubWallet
}

export const SubWalletEdit = ({
  network,
  wallet,
  subWallet
}: SubWalletEditProps) => {
  const account = useChainAccountByIndex(
    wallet.id,
    network.kind,
    network.chainId,
    subWallet.index
  )

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

  return (
    <Stack spacing="12">
      <SubWalletNameEdit wallet={wallet} subWallet={subWallet} />

      <Stack>
        <Text fontSize="md" fontWeight="medium">
          Address
        </Text>

        <Text fontSize="lg" fontWeight="medium" color="gray.500">
          {account?.address}
        </Text>
      </Stack>

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
        <Button variant="outline" colorScheme="purple" onClick={onExportOpen}>
          Export Private Key
        </Button>
        <Button colorScheme="red">Delete Account</Button>
      </HStack>

      {account && (
        <ExportPrivateKeyModal
          account={account}
          isOpen={isExportOpen}
          onClose={onExportClose}
        />
      )}
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
        validate={(value: string) => value.trim().slice(0, 64) || false}
        asyncValidate={async (value: string) => {
          return !(await DB.subWallets
            .where('[masterId+name]')
            .equals([wallet.id, value])
            .first())
        }}
        onChange={(value: string) => {
          DB.subWallets.update(subWallet, { name: value })
        }}
        onInvalid={setIsNameExists}
      />
      <FormErrorMessage>This account name exists.</FormErrorMessage>
    </FormControl>
  )
}
