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

import { HdPathInput } from '~components/HdPathInput'
import { SaveInput } from '~components/SaveInput'
import { DB } from '~lib/db'
import { INetwork } from '~lib/schema'
import { IWallet } from '~lib/schema/wallet'
import {
  WALLET_SERVICE,
  WalletInfo,
  useHdPath,
  useSubWallets
} from '~lib/services/walletService'
import { WalletType, getWalletTypeTitle } from '~lib/wallet'
import { ChangeHdPathModal } from '~pages/Settings/SettingsWallets/ChangeHdPathModal'

import {
  WrappedDeleteWalletModal,
  useDeleteWalletModal
} from './DeleteWalletModal'
import { ExportMnemonicModal } from './ExportMnemonicModal'

interface WalletEditProps {
  network: INetwork
  wallet: IWallet
  onDelete: () => void
}

export const WalletEdit = ({ network, wallet, onDelete }: WalletEditProps) => {
  const subWallets = useSubWallets(wallet.id)

  const [hdPath, derivePosition] = useHdPath(network.kind, wallet, 0)

  const [deriveNum, setDeriveNum] = useState(0)

  const {
    isOpen: isChangeHdPathOpen,
    onOpen: onChangeHdPathOpen,
    onClose: onChangeHdPathClose
  } = useDisclosure()

  const {
    isOpen: isExportOpen,
    onOpen: onExportOpen,
    onClose: onExportClose
  } = useDisclosure()

  const notBackedUp = (wallet.info as WalletInfo)?.notBackedUp

  const { onOpen: onOpenDeleteWallet } = useDeleteWalletModal()

  return (
    <Stack spacing="12" fontSize="md">
      <WalletNameEdit wallet={wallet} />

      <Text fontWeight="medium">Type: {getWalletTypeTitle(wallet.type)}</Text>

      {wallet.type === WalletType.HD && hdPath && (
        <FormControl>
          <FormLabel>HD Path Schema</FormLabel>

          <HStack spacing={12}>
            <HdPathInput
              forcePrefixLength={stringToPath(hdPath).length}
              fixedLength
              derivePosition={derivePosition}
              value={hdPath}
            />
            <Button colorScheme="purple" onClick={onChangeHdPathOpen}>
              Change
            </Button>
          </HStack>
        </FormControl>
      )}

      <Stack spacing={6}>
        <FormControl>
          <HStack spacing={8}>
            <Text fontSize="md" fontWeight="medium">
              Accounts: {subWallets?.length}
            </Text>

            {/* TODO */}
            {/*<Button variant="outline" colorScheme="purple">*/}
            {/*  Reset Order*/}
            {/*</Button>*/}
          </HStack>
        </FormControl>

        <FormControl>
          <FormLabel>Derive New Accounts</FormLabel>
          <SaveInput
            isNumber
            hideSaveIfNoChange
            stretchInput
            saveTitle="Derive"
            value={deriveNum + ''}
            validate={(value: string) => {
              if (isNaN(+value)) {
                return false
              }
              return Math.min(Math.max(+value, 0), 1000) + ''
            }}
            onChange={(value: string) => {
              setDeriveNum(+value)
              WALLET_SERVICE.deriveSubWallets(wallet.id, +value).finally(() => {
                setDeriveNum(0)
              })
            }}
          />
        </FormControl>
      </Stack>

      <HStack justify="end" spacing={6}>
        {wallet.type === WalletType.HD && (
          <Button variant="outline" colorScheme="purple" onClick={onExportOpen}>
            {!notBackedUp ? 'Export Secret Phrase' : 'Back up Secret Phrase'}
          </Button>
        )}
        <Button
          colorScheme="red"
          onClick={() => {
            onOpenDeleteWallet({ all: true, wallet })
          }}>
          Delete Wallet
        </Button>
      </HStack>

      <ChangeHdPathModal
        isOpen={isChangeHdPathOpen}
        onClose={onChangeHdPathClose}
        network={network}
        wallet={wallet}
      />

      <ExportMnemonicModal
        walletId={wallet.id}
        notBackedUp={notBackedUp}
        isOpen={isExportOpen}
        onClose={onExportClose}
      />

      <WrappedDeleteWalletModal onDelete={onDelete} />
    </Stack>
  )
}

export const WalletNameEdit = ({ wallet }: { wallet: IWallet }) => {
  const [isNameExists, setIsNameExists] = useState(false)

  return (
    <FormControl isInvalid={isNameExists}>
      <FormLabel>Wallet Name</FormLabel>
      <SaveInput
        hideSaveIfNoChange
        stretchInput
        value={wallet.name}
        validate={(value: string) => value.trim().slice(0, 64) || false}
        asyncValidate={async (value: string) => {
          return !(await DB.wallets.where('name').equals(value).first())
        }}
        onChange={(value: string) => {
          DB.wallets.update(wallet, { name: value })
        }}
        onInvalid={setIsNameExists}
      />
      <FormErrorMessage>This wallet name exists.</FormErrorMessage>
    </FormControl>
  )
}
