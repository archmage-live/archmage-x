import {
  Button,
  FormControl,
  FormLabel,
  HStack,
  Stack,
  Text,
  useDisclosure
} from '@chakra-ui/react'
import { stringToPath } from '@cosmjs/crypto'
import { useState } from 'react'

import { ChangeHdPathModal } from '~components/ChangeHdPathModal'
import {
  WrappedDeleteWalletModal,
  useDeleteWalletModal
} from '~components/DeleteWalletModal'
import { ExportMnemonicModal } from '~components/ExportMnemonicModal'
import { HdPathInput } from '~components/HdPathInput'
import { SaveInput } from '~components/SaveInput'
import { WalletNameEdit } from '~components/WalletNameEdit'
import { INetwork, IWallet, WalletInfo } from '~lib/schema'
import { WALLET_SERVICE, useHdPath, useSubWallets } from '~lib/services/wallet'
import { WalletType, getWalletTypeTitle } from '~lib/wallet'

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

      <Text fontWeight="medium">Type: {getWalletTypeTitle(wallet)}</Text>

      {(wallet.type === WalletType.HD || wallet.type === WalletType.HW_GROUP) &&
        hdPath && (
          <FormControl>
            <FormLabel>HD Path Schema</FormLabel>

            <HStack spacing={12}>
              <HdPathInput
                forcePrefixLength={stringToPath(hdPath).length}
                fixedLength
                derivePosition={derivePosition}
                value={hdPath}
              />
              {wallet.type === WalletType.HD && (
                <Button colorScheme="purple" onClick={onChangeHdPathOpen}>
                  Change
                </Button>
              )}
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

        {wallet.type === WalletType.HD && (
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
                WALLET_SERVICE.deriveSubWallets(wallet.id, +value).finally(
                  () => {
                    setDeriveNum(0)
                  }
                )
              }}
            />
          </FormControl>
        )}
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

      {wallet.type === WalletType.HD && (
        <ChangeHdPathModal
          isOpen={isChangeHdPathOpen}
          onClose={onChangeHdPathClose}
          network={network}
          wallet={wallet}
        />
      )}

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
