import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Stack,
  Text,
  useDisclosure
} from '@chakra-ui/react'
import { stringToPath } from '@cosmjs/crypto'
import { useState } from 'react'
import browser from 'webextension-polyfill'

import { CopyArea } from '~components/CopyIcon'
import { HdPathInput } from '~components/HdPathInput'
import { SaveInput } from '~components/SaveInput'
import { DB } from '~lib/db'
import { formatNumber } from '~lib/formatNumber'
import { INetwork, ISubWallet, IWallet, isSubNameInvalid } from '~lib/schema'
import { getAccountUrl } from '~lib/services/network'
import { useBalance } from '~lib/services/provider'
import { useChainAccountByIndex, useHdPath } from '~lib/services/wallet'
import {
  getWalletTypeTitle,
  hasWalletKeystore,
  isWalletGroup
} from '~lib/wallet'
import { WalletNameEdit } from '~pages/Settings/SettingsWallets/WalletEdit'

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

  const [hdPath] = useHdPath(network.kind, wallet, subWallet.index)

  const {
    isOpen: isExportOpen,
    onOpen: onExportOpen,
    onClose: onExportClose
  } = useDisclosure()

  const { onOpen: onOpenDeleteWallet } = useDeleteWalletModal()

  return (
    <Stack spacing="12" fontSize="md">
      {isWalletGroup(wallet.type) ? (
        <>
          <SubWalletNameEdit wallet={wallet} subWallet={subWallet} />

          <Stack>
            <Text fontWeight="medium">Master Wallet: {wallet.name}</Text>

            <Text fontWeight="medium">Index: {subWallet.index}</Text>
          </Stack>
        </>
      ) : (
        <>
          <WalletNameEdit wallet={wallet} />

          <Text fontWeight="medium">Type: {getWalletTypeTitle(wallet)}</Text>
        </>
      )}

      {account?.address ? (
        <Stack>
          <Text fontWeight="medium">Address:</Text>
          <CopyArea
            name="Address"
            copy={account.address}
            noWrap
            props={{
              noOfLines: 2
            }}
          />
        </Stack>
      ) : (
        <Text fontWeight="medium">Address: Not Available</Text>
      )}

      <Text fontWeight="medium">
        Balance:&nbsp;
        {formatNumber(balance?.amount)} {balance?.symbol}
      </Text>

      {hdPath && (
        <FormControl>
          <FormLabel>HD Path</FormLabel>

          <HdPathInput
            forcePrefixLength={stringToPath(hdPath).length}
            fixedLength
            value={hdPath}
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

        {hasWalletKeystore(wallet.type) && (
          <Button variant="outline" colorScheme="purple" onClick={onExportOpen}>
            Export Private Key
          </Button>
        )}

        <Button
          colorScheme="red"
          onClick={() => {
            onOpenDeleteWallet({ subWallet })
          }}>
          Delete {isWalletGroup(wallet.type) ? 'Account' : 'Wallet'}
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
