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

interface SubWalletEditProps {
  network: INetwork
  master: IWallet
  wallet: ISubWallet
}

export const SubWalletEdit = ({
  network,
  master,
  wallet
}: SubWalletEditProps) => {
  const info = useChainAccountByIndex(
    master.id,
    network.kind,
    network.chainId,
    wallet.index
  )

  const hdPaths = useHdPaths(master.id)
  const [hdPath, setHdPath] = useState('')
  useEffect(() => {
    const hdPath = hdPaths?.get(network.kind)
    if (!hdPath) {
      return
    }
    const fullHdPath = stringToPath(hdPath).concat(
      // TODO
      Slip10RawIndex.normal(wallet.index)
    )
    setHdPath(pathToString(fullHdPath))
  }, [hdPaths, network, wallet])

  const [isNameExists, setIsNameExists] = useState(false)

  const {
    isOpen: isExportOpen,
    onOpen: onExportOpen,
    onClose: onExportClose
  } = useDisclosure()

  return (
    <Stack spacing="12">
      <FormControl isInvalid={isNameExists}>
        <FormLabel>Wallet Name</FormLabel>
        <SaveInput
          hideSaveIfNoChange
          stretchInput
          value={wallet.name}
          validate={(value: string) => value.trim().slice(0, 64) || false}
          asyncValidate={async (value: string) => {
            return !(await DB.subWallets
              .where('[masterId+name]')
              .equals([master.id, value])
              .first())
          }}
          onChange={(value: string) => {
            DB.subWallets.update(wallet, { name: value })
          }}
          onInvalid={setIsNameExists}
        />
        <FormErrorMessage>This wallet name exists.</FormErrorMessage>
      </FormControl>

      <Stack>
        <Text fontSize="md" fontWeight="medium">
          Address
        </Text>

        <Text fontSize="lg" fontWeight="medium" color="gray.500">
          {info?.address}
        </Text>
      </Stack>

      <Stack>
        <Text fontSize="md" fontWeight="medium">
          <chakra.span color="gray.500">Master Wallet:&nbsp;</chakra.span>
          {master.name}
        </Text>

        <Text fontSize="md" fontWeight="medium">
          <chakra.span color="gray.500">Index:&nbsp;</chakra.span>
          {wallet.index}
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
        <Button colorScheme="red">Delete Wallet</Button>
      </HStack>
    </Stack>
  )
}
